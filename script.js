let API_BASE = "http://127.0.0.1:8000"
let expoblue;
let expocon;
let currentRecommendations;
let selected = document.getElementById("selected")

async function callapi(path, body)
{
    let response = await fetch(API_BASE + path, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body)
    })

    if (!response.ok)
    {
        throw new Error("Server returned " + response.status + " for " + path)
    }

    let data = await response.json()

    if (data.error)
    {
        throw new Error(data.error)
    }

    return data
}

async function read()
{
    let value = document.getElementById("input").value
    console.log(value)
    try
    {
        let data1 = await callapi("/ingest", {"raw_text" : value})
        console.log(data1)
        return data1
    }
    catch (error)
    {
        console.error("ingest failed:", error)
        document.getElementById("output").innerHTML = error.message
        return null
    }
}

async function structure()
{
    let returned = document.getElementById("input").value
    try
    {
        let data2 = await callapi("/structure", {"raw_text": returned})
        expocon = data2
        return data2
    }
    catch (error)
    {
        console.error("structure failed:", error)
        document.getElementById("output").innerHTML = error.message
        return null
    }
}

async function recommend()
{
    let ingested = await read()
    if (!ingested)
    {
        return
    }
    let value = await structure()
    if (!value)
    {
        return
    }
    try
    {
        let data3 = await callapi("/recommend", value)
        showRecommendations(data3.recommendations)
    }
    catch (error)
    {
        console.error("recommend failed:", error)
        document.getElementById("output").innerHTML = error.message
    }
}

function showRecommendations(recommendations)
{
    let html = ""
    for (let i = 0; i < recommendations.length; i++) {
        html += `<button data-index="${i}">${recommendations[i].title}</button>`
    }
    document.getElementById("output").innerHTML = html
    currentRecommendations = recommendations
}

selected.addEventListener("click", recommend)

document.getElementById("output").addEventListener("click", async function(event) {
    let index = event.target.dataset.index
    console.log(index)
    let chosen = currentRecommendations[index]
    if (!chosen)
    {
        return
    }
    try
    {
        let data4 = await callapi("/solution", chosen)
        document.getElementById("output").innerHTML = JSON.stringify(data4)
        expoblue = data4
        let expoBody = {
            context: expocon,
            recommendations: {recommendations: currentRecommendations},
            blueprint: expoblue
        }

        let response5 = await fetch(API_BASE + "/export", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(expoBody)
        })
        let data5 = await response5.text()

        let blob = new Blob([data5], {type: "text/markdown"})
        let url = URL.createObjectURL(blob)
        let link = document.createElement("a")
        link.href = url
        link.download = "solution.md"
        link.click()
        setTimeout(function ()
        {
            URL.revokeObjectURL(url)
        }, 1000)
    }
    catch (error)
    {
        console.error("solution/export failed:", error)
        document.getElementById("output").innerHTML = error.message
    }
})

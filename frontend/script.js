// Empty string = "same site this page was loaded from".
// Backend and frontend are served by the same app now, so fetch("/ingest")
// works identically on localhost and in production.
let API_BASE = ""
let expoblue;
let expocon;
let currentRecommendations;
let selected = document.getElementById("selected")

async function callapi(path, body)
{
    let response

    try
    {
        response = await fetch(API_BASE + path, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(body)
        })
    }
    catch (networkError)
    {
        // fetch only throws on a genuine network failure, and its message is
        // just "Failed to fetch" - useless to anyone who isn't the developer
        throw new Error("Couldn't reach the server. Is the backend running?")
    }

    if (!response.ok)
    {
        throw new Error("Server returned " + response.status + " for " + path)
    }

    let data

    try
    {
        data = await response.json()
    }
    catch (parseError)
    {
        throw new Error("The server sent a response that wasn't valid JSON.")
    }

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
    // Without this, clicking Analyze twice runs two whole pipelines side by
    // side - four Gemini calls for one intent, and whichever finishes last
    // wins the output.
    if (selected.disabled)
    {
        return
    }
    selected.disabled = true

    try
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

        let data3 = await callapi("/recommend", value)
        showRecommendations(data3.recommendations)
    }
    catch (error)
    {
        console.error("recommend failed:", error)
        document.getElementById("output").innerHTML = error.message
    }
    finally
    {
        // runs on success, on error, AND on the two early returns above -
        // this is the job finally exists for
        selected.disabled = false
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

let solving = false

document.getElementById("output").addEventListener("click", async function(event) {
    let index = event.target.dataset.index
    console.log(index)
    let chosen = currentRecommendations[index]
    if (!chosen || solving)
    {
        return
    }
    solving = true
    try
    {
        let data4 = await callapi("/solution", chosen)
        renderBlueprint(data4)
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
    finally
    {
        solving = false
    }
})

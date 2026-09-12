async function read()
{
    let value = document.getElementById("input").value
    console.log(value)
    let response = await fetch("http://127.0.0.1:8000/ingest", {
        method: "POST",
        headers: {
            "Content-Type" : "application/json"
        },
        body: JSON.stringify({"raw_text" : value})
    })  
    let data1 = await response.json()
    console.log(data1)
    
    let returned = JSON.stringify(data1)
    return returned
}
let expoblue;
let expocon;
let currentRecommendations;
let selected = document.getElementById("selected")
selected.addEventListener("click", read)
async function structure()
{
   let returned = document.getElementById("input").value
    let response2 = await fetch("http://127.0.0.1:8000/structure", {
        method: "POST",
        headers: {
            "Content-Type" : "application/json"
        },
        body: JSON.stringify({"raw_text": returned})
    })
    let data2 = await response2.json()
    let recieved = JSON.stringify(data2)
    expocon = data2
    return recieved
}
async function recommend()
{
    let value = await structure()
    let responce3 = await fetch("http://127.0.0.1:8000/recommend", {
        method: "POST", 
        headers: {
            "Content-Type" : "application/json"
        },
        body: value
    })
    let data3 = await responce3.json()
    let recieved = JSON.stringify(data3)
    showRecommendations(data3.recommendations)
}
selected.addEventListener("click", recommend)
function showRecommendations(recommendations)
{
    let html = ""
    for (let i = 0; i < recommendations.length; i++) {
        html += `<button data-index="${i}">${recommendations[i].title}</button>`
    }
    document.getElementById("output").innerHTML = html
    currentRecommendations = recommendations
}
document.getElementById("output").addEventListener("click", async function(event) {
    let index = event.target.dataset.index
    console.log(index)
    let chosen = currentRecommendations[index]
    if (!chosen)
    {
        return
    }
    let response4 = await fetch("http://127.0.0.1:8000/solution", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(chosen)
    })
    let data4 = await response4.json()
    document.getElementById("output").innerHTML = JSON.stringify(data4)
    expoblue = data4
    let expoBody = {
        context: expocon,
        recommendations: {recommendations: currentRecommendations},
        blueprint: expoblue
    }

    let response5= await fetch("http://127.0.0.1:8000/export", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(expoBody)
    })
    let data5 = await response5.text()
    document.getElementById("output").innerHTML = data5;
})

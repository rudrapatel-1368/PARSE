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
    document.getElementById("output").innerHTML = recieved;   
}
selected.addEventListener("click", recommend)

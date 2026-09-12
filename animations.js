/* =========================================================================
   PARSE - presentation layer only.
   Deliberately separate from script.js: nothing in here knows about your
   API pipeline, and script.js does not know this file exists. It drives the
   thinking-loader by watching #output for changes, so your pipeline code
   needed no edits.
   ========================================================================= */

// ---------- page load shimmer ----------
window.addEventListener("load", function ()
{
    let pageLoader = document.getElementById("page-loader")
    setTimeout(function () { pageLoader.classList.add("is-done") }, 550)
})

// ---------- nav: border on scroll + active section ----------
let nav = document.getElementById("nav")

window.addEventListener("scroll", function ()
{
    nav.classList.toggle("is-scrolled", window.scrollY > 12)
}, { passive: true })

let navLinks = document.querySelectorAll(".nav-link")
let sections = document.querySelectorAll("#home, #about, #contact")

let sectionWatcher = new IntersectionObserver(function (entries)
{
    entries.forEach(function (entry)
    {
        if (!entry.isIntersecting) { return }
        navLinks.forEach(function (link)
        {
            link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id)
        })
    })
}, { rootMargin: "-45% 0px -45% 0px" })

sections.forEach(function (section) { sectionWatcher.observe(section) })

// ---------- expanding dock ----------
let dock = document.getElementById("dock")
let dockTrigger = document.getElementById("dock-trigger")
let dockClose = document.getElementById("dock-close")
let inputBox = document.getElementById("input")

function openDock()
{
    dock.classList.add("is-open")
    dockTrigger.setAttribute("aria-expanded", "true")
    inputBox.focus()
}

function closeDock()
{
    dock.classList.remove("is-open")
    dockTrigger.setAttribute("aria-expanded", "false")
    inputBox.value = ""
    inputBox.style.height = "auto"
}

dockTrigger.addEventListener("click", openDock)
dockClose.addEventListener("click", closeDock)

// grow the textarea with its content, up to the CSS max-height
inputBox.addEventListener("input", function ()
{
    inputBox.style.height = "auto"

    let needed = inputBox.scrollHeight
    let limit = Math.round(window.innerHeight * 0.4)   // matches max-height: 40vh

    inputBox.style.height = Math.min(needed, limit) + "px"
    // only scroll once the text genuinely outgrows the box, otherwise a
    // 1px rounding difference is enough to summon a scrollbar stub
    inputBox.style.overflowY = needed > limit ? "auto" : "hidden"
})

// escape closes it, ctrl/cmd+enter submits
inputBox.addEventListener("keydown", function (event)
{
    if (event.key === "Escape") { closeDock() }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey))
    {
        document.getElementById("selected").click()
    }
})

// ---------- "PARSE is thinking..." loader ----------
// Shown when a request starts, hidden as soon as script.js writes anything
// into #output - which every success and every catch block does.
let loader = document.getElementById("loader")
let output = document.getElementById("output")

let hero = document.getElementById("home")

function showThinking()
{
    loader.hidden = false
    hero.classList.add("has-results")   // collapses the PARSE wordmark away
    scheduleScrollRefresh()
}

function hideThinking() { loader.hidden = true }

document.getElementById("selected").addEventListener("click", function ()
{
    if (inputBox.value.trim().length > 0) { showThinking() }
})

// clicking a recommendation kicks off /solution + /export
output.addEventListener("click", function (event)
{
    if (event.target.closest("button")) { showThinking() }
})

// Rendering a blueprint makes the hero hundreds of pixels taller, which
// invalidates every ScrollTrigger position measured at page load. Without a
// refresh the pinned section engages at the wrong scroll position.
let refreshTimer
let hadOutput = false

function safeRefresh()
{
    if (!window.ScrollTrigger) { return }

    let pinned = ScrollTrigger.getAll().find(function (trigger) { return trigger.pin })

    // Refreshing WHILE the pin is engaged is its own bug: ScrollTrigger has to
    // re-place a position:fixed element and re-measure its spacer mid-flight,
    // and it can end up stuck full-screen with empty space below it. So if the
    // reader is currently inside the pin, wait and try again shortly.
    if (pinned && window.scrollY > pinned.start - 100 && window.scrollY < pinned.end + 100)
    {
        clearTimeout(refreshTimer)
        refreshTimer = setTimeout(safeRefresh, 400)
        return
    }

    ScrollTrigger.refresh()
}

function scheduleScrollRefresh()
{
    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(safeRefresh, 180)
}

function onOutputChanged()
{
    hideThinking()

    let hasOutput = output.innerHTML.trim().length > 0
    // keep the wordmark collapsed while there is output; bring it back if cleared
    hero.classList.toggle("has-results", hasOutput)

    // The answer just landed. If the reader scrolled off while waiting, bring
    // them back to it - they asked for this, and it also means the big layout
    // change happens at the top of the page where no pin is engaged.
    if (hasOutput && !hadOutput && window.scrollY > 120)
    {
        document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" })
    }
    hadOutput = hasOutput

    scheduleScrollRefresh()
}

new MutationObserver(onOutputChanged).observe(output, { childList: true, subtree: true, characterData: true })

// ---------- scroll animations ----------
let revealTl = null
let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

if (!window.gsap || !window.ScrollTrigger || reduceMotion)
{
    // CDN blocked or motion turned off - make everything visible so the
    // About section is never a blank screen.
    document.documentElement.classList.add("no-gsap")
}
else
{
    gsap.registerPlugin(ScrollTrigger)

    // split the headline into words (replaces GSAP's paid-era SplitText)
    let kinetic = document.getElementById("kinetic")
    let words = kinetic.textContent.trim().split(/\s+/)
    kinetic.innerHTML = words.map(function (word) { return '<span class="word">' + word + "</span>" }).join(" ")

    gsap.set(".kinetic .word", { opacity: 0, rotate: 8, yPercent: 30 })

    revealTl = gsap.timeline({
        scrollTrigger: { trigger: "#about", start: "top 85%", end: "top 20%", scrub: 1.2 }
    })

    revealTl.to(".kinetic .word", {
        stagger: 0.2, opacity: 1, rotate: 0, yPercent: 0, ease: "power1.inOut"
    })

    revealTl.to(".tag", {
        duration: 1,
        opacity: 1,
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        stagger: 0.2,
        ease: "circ.out"
    }, ">-0.4")

    // pinned circle-to-fullscreen reveal of the pipeline - desktop only.
    // Five stage cards cannot fit one phone screen, so below 901px the
    // section just lays out normally (see the media query in style.css).
    let mm = gsap.matchMedia()

    mm.add("(min-width: 901px)", function ()
    {
        gsap.set("#pin-box", { clipPath: "circle(11% at 50% 50%)" })
        gsap.set(".pipeline", { opacity: 0 })       // set here, not in CSS, so the
        gsap.set("#pin-teaser", { opacity: 1 })     // no-gsap fallback stays readable

        let pinTl = gsap.timeline({
            scrollTrigger: {
                trigger: "#pin-wrap",
                start: "top top",
                end: "+=2200",
                scrub: 1.5,
                pin: true,
                pinSpacing: true,
                anticipatePin: 1
            }
        })

        // circle grows across the whole scroll
        pinTl.to("#pin-box", { clipPath: "circle(150% at 50% 50%)", ease: "none", duration: 1 }, 0)
        // "How?" holds briefly, then fades out over the first fifth
        pinTl.to("#pin-teaser", { opacity: 0, scale: 0.75, ease: "none", duration: 0.18 }, 0.06)
        // pipeline fades in just behind it
        pinTl.to(".pipeline", { opacity: 1, ease: "none", duration: 0.26 }, 0.16)
    })
}

/* =========================================================================
   Blueprint rendering
   script.js calls renderBlueprint(data4) with the object /solution returned.
   All the markup building lives here so the pipeline code stays clean.
   ========================================================================= */

if (window.mermaid)
{
    mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        themeVariables: {
            background: "#14150f",
            primaryColor: "#23261c",
            primaryTextColor: "#f1dca7",
            primaryBorderColor: "#797d62",
            secondaryColor: "#2a2e20",
            tertiaryColor: "#1b1d15",
            lineColor: "#9b9b7a",
            textColor: "#f1dca7",
            fontFamily: "system-ui, sans-serif",
            fontSize: "14px"
        }
    })
}

// Gemini's text goes into innerHTML, so it gets escaped first.
function escapeHtml(value)
{
    let holder = document.createElement("div")
    holder.textContent = String(value === undefined || value === null ? "" : value)
    return holder.innerHTML
}

function listItems(values)
{
    if (!Array.isArray(values)) { return "" }
    return values.map(function (value) { return "<li>" + escapeHtml(value) + "</li>" }).join("")
}

function renderBlueprint(blueprint)
{
    let components = listItems(blueprint.components)
    let workflow = listItems(blueprint.workflow)

    let html = '<article class="bp">'
    html += '<h3 class="bp-title">' + escapeHtml(blueprint.solution_name || "Solution") + "</h3>"

    if (components)
    {
        html += '<section class="bp-section"><h4>Components</h4><ul class="bp-list">' + components + "</ul></section>"
    }
    if (workflow)
    {
        html += '<section class="bp-section"><h4>Workflow</h4><ol class="bp-steps">' + workflow + "</ol></section>"
    }
    if (blueprint.diagram)
    {
        html += '<section class="bp-section"><h4>Architecture</h4><div class="bp-diagram" id="bp-diagram"></div></section>'
    }

    html += "</article>"
    output.innerHTML = html

    drawDiagram(blueprint.diagram)
}

function drawDiagram(source)
{
    let host = document.getElementById("bp-diagram")
    if (!host || !source) { return }

    function showSource()
    {
        host.innerHTML = '<pre class="bp-fallback">' + escapeHtml(source) + "</pre>"
    }

    if (!window.mermaid) { showSource(); return }

    // unique id each time, or mermaid reuses a stale cached render
    mermaid.render("bp-svg-" + Date.now(), source)
        .then(function (result) { host.innerHTML = result.svg })
        .catch(function () { showSource() })
}

/* ---------- About links land where the pills are fully formed ----------
   The reveal is scrub-linked, so jumping to #about lands at the START of the
   timeline with the pills half-wiped. Scroll to the timeline's end instead. */
document.querySelectorAll('a[href="#about"]').forEach(function (link)
{
    link.addEventListener("click", function (event)
    {
        if (!revealTl || !revealTl.scrollTrigger) { return }   // fall back to the plain anchor
        event.preventDefault()
        window.scrollTo({ top: Math.round(revealTl.scrollTrigger.end), behavior: "smooth" })
    })
})

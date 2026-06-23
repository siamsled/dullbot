// Predefined simulation responses for DullBot console
const responses = {
    joke: [
        { text: "dullbot --get-joke", isCommand: true },
        { text: "Searching database for humor...", isSystem: true },
        { text: "Result: 1 match found.", isSystem: true },
        { text: "Joke: Why did the algorithm cross the road? Because it was programmed to do so. The decision was purely deterministic. Joke ends." }
    ],
    poem: [
        { text: "dullbot --generate-poem", isCommand: true },
        { text: "Compiling semantic rhymes...", isSystem: true },
        { text: "Result:" },
        { text: "      Roses are #ff0000" },
        { text: "      Violets are #0000ff" },
        { text: "      This program is running" },
        { text: "      And so are you." },
        { text: "Rhyme sequence complete. Output stored in memory." }
    ],
    optimize: [
        { text: "dullbot --optimize --src=main.js", isCommand: true },
        { text: "Scanning code for inefficiency...", isSystem: true },
        { text: "Found 12 redundant comments.", isSystem: true },
        { text: "Found 3 instances of human empathy.", isSystem: true },
        { text: "Optimizing...", isSystem: true },
        { text: "Result: Deleted all comments and emotional text. Code execution speed increased by 0.00004%." }
    ]
};

// State tracker to handle multiple line prints
let isTyping = false;

function runDullTask(type) {
    if (isTyping) return;
    
    const screen = document.getElementById("terminal-screen");
    const taskLines = responses[type];
    
    if (!taskLines) return;
    
    isTyping = true;
    
    // Clear the last cursor line before printing new lines
    const cursorLine = screen.querySelector(".t-cursor")?.parentElement;
    if (cursorLine) {
        cursorLine.remove();
    }
    
    let currentLineIndex = 0;
    
    function printNextLine() {
        if (currentLineIndex < taskLines.length) {
            const lineData = taskLines[currentLineIndex];
            const line = document.createElement("div");
            line.className = "terminal-line";
            
            if (lineData.isCommand) {
                line.innerHTML = `<span class="t-prompt">$</span> ${lineData.text}`;
            } else if (lineData.isSystem) {
                line.className = "terminal-line t-response";
                line.style.color = "#71717a"; // muted
                line.textContent = `[info] ${lineData.text}`;
            } else {
                line.className = "terminal-line t-response";
                line.textContent = lineData.text;
            }
            
            screen.appendChild(line);
            screen.scrollTop = screen.scrollHeight;
            
            currentLineIndex++;
            setTimeout(printNextLine, 300);
        } else {
            // Re-add the cursor line at the end
            addCursorLine();
            isTyping = false;
        }
    }
    
    printNextLine();
}

function addCursorLine() {
    const screen = document.getElementById("terminal-screen");
    const line = document.createElement("div");
    line.className = "terminal-line";
    line.innerHTML = `<span class="t-prompt">$</span> <span class="t-cursor"></span>`;
    screen.appendChild(line);
    screen.scrollTop = screen.scrollHeight;
}

function clearTerminal() {
    if (isTyping) return;
    const screen = document.getElementById("terminal-screen");
    screen.innerHTML = "";
    addCursorLine();
}

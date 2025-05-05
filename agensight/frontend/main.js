document.addEventListener("DOMContentLoaded", () => {
  const agentSelect = document.getElementById("agent-select");
  const promptSection = document.getElementById("prompt-section");
  const logSection = document.getElementById("log-section");

  // Load agents
  fetch("/agents")
    .then(res => res.json())
    .then(agents => {
      agents.forEach(agent => {
        const option = document.createElement("option");
        option.value = agent;
        option.textContent = agent;
        agentSelect.appendChild(option);
      });
    });


  let logInterval;
  agentSelect.addEventListener("change", () => {
    const agent = agentSelect.value;
    if (!agent) {
      promptSection.innerHTML = "";
      logSection.innerHTML = "";
      if (logInterval) clearInterval(logInterval);
      return;
    }

    // Load prompt.json
    fetch(`/prompt/${agent}`).then(res => res.json()).then(promptData => {
      const prompts = promptData.prompts || [];
      if (prompts.length === 0) {
        promptSection.innerHTML = "<p>No prompt found for this agent.</p>";
        return;
      }
    
      // Find current prompt index
      let currentIdx = prompts.findIndex(p => p.current);
    
      // Function to render the UI for a given version index
      function renderPromptUI(selectedIdx) {
        selectedIdx = parseInt(selectedIdx);
        const p = prompts[selectedIdx];
      
        // Build version selector with the correct selected value
        let versionSelector = '<label for="prompt-version">Prompt Version:</label>';
        versionSelector += '<select id="prompt-version">';
        prompts.forEach((p, idx) => {
          versionSelector += `<option value="${idx}" ${selectedIdx === idx ? "selected" : ""}>Version ${idx + 1}${p.current ? " (current)" : ""}</option>`;
        });
        versionSelector += '</select>';
      
        // Build prompt display
        let promptHtml = `
          ${versionSelector}
          <h2>Prompt (Version ${selectedIdx + 1}${p.current ? " - Current" : ""})</h2>
        `;
        if (p.current) {
          promptHtml += `
            <textarea id="prompt-edit" rows="4" style="width:100%;">${p.prompt}</textarea>
            <button id="save-prompt">Save as New Version</button>
          `;
        } else {
          promptHtml += `<pre>${p.prompt}</pre>`;
        }
        promptSection.innerHTML = promptHtml;
      
        // Attach change handler for version selector
        document.getElementById("prompt-version").onchange = (e) => {
          const selectedIdx = parseInt(e.target.value);
          // Make the selected version current
          fetch(`/prompt/${agent}/set_current`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ index: selectedIdx })
          })
          .then(res => res.json())
          .then(() => {
            // Reload prompts after setting current
            agentSelect.dispatchEvent(new Event("change"));
          });
        };
      
        // Save as new version handler (only for current)
        if (p.current) {
          document.getElementById("save-prompt").onclick = () => {
            const newPrompt = document.getElementById("prompt-edit").value;
            fetch(`/prompt/${agent}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: newPrompt })
            })
            .then(res => res.json())
            .then(() => {
              agentSelect.dispatchEvent(new Event("change"));
            });
          };
        }
      }
      
      loadLogs(agent);
      if (logInterval) clearInterval(logInterval);
      // Set up polling every 2 seconds (2000 ms)
      logInterval = setInterval(() => loadLogs(agent), 2000);
      // Initial render: show current version
      renderPromptUI(currentIdx >= 0 ? currentIdx : 0);
    });
    // Load agent.log
    function loadLogs(agent) {

      const scrollDiv = document.querySelector('.log-table-scroll');
      const prevScrollTop = scrollDiv ? scrollDiv.scrollTop : 0;

      fetch(`/log/${agent}`)
        .then(res => res.json())
        .then(logs => {
          if (logs.length === 0) {
            logSection.innerHTML = "<p>No logs found for this agent.</p>";
          } else {
            let table = `<h2>Logs for ${agent}</h2>
            <div class="log-table-scroll">
              <table border="1" cellpadding="5">
                <tr><th>Timestamp</th><th>Prompt</th><th>Output</th></tr>`;
            logs.slice().reverse().forEach(entry => {
              table += `<tr>
              <td>${entry.timestamp ? entry.timestamp : ''}</td>
                <td>${entry.prompt}</td>
                <td>${entry.output}</td>
              </tr>`;
            });
            table += "</table></div>";
            logSection.innerHTML = table;

            const newScrollDiv = document.querySelector('.log-table-scroll');
            if (newScrollDiv) newScrollDiv.scrollTop = prevScrollTop;
          }
        });
    }
  });
});
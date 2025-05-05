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

  agentSelect.addEventListener("change", () => {
    const agent = agentSelect.value;
    if (!agent) {
      promptSection.innerHTML = "";
      logSection.innerHTML = "";
      return;
    }

    // Load prompt.json
    fetch(`/prompt/${agent}`).then(res => res.json()).then(prompt => {
      if (!prompt) {
        promptSection.innerHTML = "<p>No prompt found for this agent.</p>";
      } else {
        promptSection.innerHTML = `
          <h2>Prompt for ${agent}</h2>
          <pre>${prompt["prompt"]}</pre>
        `;
      }
    });

    // Load agent.log
    fetch(`/log/${agent}`)
      .then(res => res.json())
      .then(logs => {
        if (logs.length === 0) {
          logSection.innerHTML = "<p>No logs found for this agent.</p>";
        } else {
          let table = `<h2>Logs for ${agent}</h2>
            <table border="1" cellpadding="5">
              <tr><th>Prompt</th><th>Output</th></tr>`;
          logs.forEach(entry => {
            table += `<tr>
              <td>${entry.prompt}</td>
              <td>${entry.output}</td>
            </tr>`;
          });
          table += "</table>";
          logSection.innerHTML = table;
        }
      });
  });
});
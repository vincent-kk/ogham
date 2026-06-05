#!/usr/bin/env node
function t(){return"[prawf] plugin skeleton active."}try{process.stdout.write(JSON.stringify({continue:!0,hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:t()}}))}catch(e){process.stderr.write(`[prawf] injectStatic failed: ${e.message}
`),process.stdout.write(JSON.stringify({continue:!0}))}process.exit(0);

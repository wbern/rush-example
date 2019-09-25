const lerna_process = require("@lerna/child-process");

let executions = [];

for (let i = 0; i < 5; i++) {
  executions.push(
    lerna_process.spawnStreaming(
      "echo",
      [Math.floor(i * 1.5).toString()],
      undefined,
      "index " + i
    )
  );
}

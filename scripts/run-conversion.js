const { runConversion } = require("../src/conversion-runtime");

const { command, args, ...options } = JSON.parse(process.argv[2]);
runConversion(command, args, options)
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });

const code = Number(process.argv[2] ?? "0");
process.exit(Number.isNaN(code) ? 1 : code);

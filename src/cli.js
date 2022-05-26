const { readFileSync } = require('fs');
const { createNewParser } = require('./compiler');
const { program } = require('commander');
const chalk = require('chalk');

global.__basedir = __dirname;

program
  .name('jpp')
  .description('Compiler and interpeter for the JPP language')
  .version('0.0.1');

program
  .command('compile')
  .description('Compiles a .jpp file into an intermediate representation')
  .argument('<file>', 'The jpp file to compile')
  .option(
    '-d, --dump',
    'Dump the generated intermediate representation into the console'
  )
  // .option('-o, --output', 'The output file of the compiler')
  .option(
    '-p, --pretty',
    'The dumped ir table will have the addresses human readable'
  )
  .option('-r, --run', 'Runs the resulting code in a virtual machine')
  .action((filePath, options) => {
    const fileContent = readFileSync(filePath, 'utf-8');
    console.log(chalk.yellow(`Compiling ${filePath}`));
    const { ir } = createNewParser(filePath, fileContent);

    if (options.dump) {
      if (options.pretty) {
        console.table(ir.prettyQuads());
      } else {
        console.table(ir.getQuadruplesManager().quadruples);
      }
    }

    if (options.run) {
      console.log(chalk.yellow(`Running ${filePath}...`));
      const vm = new VirtualMachine(ir);
      vm.run();
      console.log(chalk.green(`Program finished.`));
    }
  });

program.parse();

// // cli/index.ts

// import { Command } from 'commander'
// import { version } from 'react'
// import { generateAllModels } from '../generators/generateAll'


// // Initialize the CLI program
// const program = new Command()

// program
//   .name('nxf') // CLI command name
//   .description('NextFlutter CLI') // Description shown in help
//   .version(version) // Automatically loads version from package.json

// // Define the 'generate' command with options
// program
//   .command('generate')
//   .description('Generate code from shared models')
//   .option('--all', 'Generate code for all models') // Full codegen for all models
//   .option('--model <name>', 'Generate code for a specific model') // e.g. --model Product
//   .option('--models <names>', 'Generate code for multiple models (comma-separated)') // e.g. --models Product,User
//   .option('--flutter-only', 'Only generate Flutter models') // Skip Next.js
//   .option('--next-only', 'Only generate Next.js models') // Skip Flutter
//   .option('--force', 'Overwrite existing generated files') // Force overwrite even if file exists
//   .option('--format', 'Auto-format output files') // e.g. Prettier, dart format
//   .option('--with-mocks', 'Generate mock data for models') // Include mock data generation
//   .action(async (options) => {
//     // Determine generation mode based on user options
//     if (options.all) {
//       // Generate all models
//       await generateAllModels({
//         flutter: !options.nextOnly,
//         next: !options.flutterOnly,
//         force: options.force,
//         format: options.format,
//         mocks: options.withMocks,
//       })
//     } else if (options.model) {
//       // Generate a single model
//       await generateModelsByName([options.model], {
//         flutter: !options.nextOnly,
//         next: !options.flutterOnly,
//         force: options.force,
//         format: options.format,
//         mocks: options.withMocks,
//       })
//     } else if (options.models) {
//       // Generate multiple models
//       const names = options.models.split(',').map((n: string) => n.trim())
//       await generateModelsByName(names, {
//         flutter: !options.nextOnly,
//         next: !options.flutterOnly,
//         force: options.force,
//         format: options.format,
//         mocks: options.withMocks,
//       })
//     } else {
//       // No valid input provided
//       console.log('⚠️  Please specify --all, --model <name>, or --models <name1,name2>')
//     }
//   })

// // Parse the CLI arguments
// program.parse()
// function generateModelsByName(arg0: any[], arg1: { flutter: boolean; next: boolean; force: any; format: any; mocks: any }) {
//   throw new Error('Function not implemented.')
// }


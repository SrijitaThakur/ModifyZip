const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function performReplacementsInDirectory(inputDirectory, outputDirectory, domain) {
  try {
    // Read the input directory
    const files = fs.readdirSync(inputDirectory);

    // Ensure the output directory exists
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory);
    }

    // Iterate through each file in the directory
    for (const file of files) {
      const filePath = path.join(inputDirectory, file);
      if (fs.statSync(filePath).isFile() && filePath.endsWith('.zip')) {
        const outputFilePath = path.join(outputDirectory, file);

        // Process the current ZIP file
        await processZipFile(filePath, outputFilePath, domain);
      }
    }

    console.log('Replacements completed for all ZIP files in the directory.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

function replaceHelperForTarget(content, domain) {
  let regex = new RegExp(`href:U(.*?),target:G`, "g");
  let updatedContent = content.replace(regex, (match, hrefContent) => {
    const updatedHref = `"${domain}lesson-complete"`;
    return `href:${updatedHref}${hrefContent},target:G`;
  });
  return updatedContent;
}


async function processZipFile(inputFilePath, outputFilePath, domain) {
  try {
    // Read the input ZIP file
    const data = fs.readFileSync(inputFilePath);
    const zip = new JSZip();
    await zip.loadAsync(data);

    // Process files within the ZIP
    const updatedZip = new JSZip();
    const searchStringForBlank = '_blank';
    const searchStringForTarget = `href:U(.*)target:G`;

    await Promise.all(
      Object.keys(zip.files).map(async (filePath) => {
        const file = zip.files[filePath];
        if (!file.dir) {
          let content = await file.async('text');
          
          // Perform the same replacements as in the replace() function
          content = content.replace(new RegExp(searchStringForBlank, 'g'), '_top');
          content = replaceHelperForTarget(content, domain);

          updatedZip.file(filePath, content);
        } else {
          updatedZip.folder(filePath);
        }
      })
    );

    // Generate the modified ZIP file
    const modifiedZipData = await updatedZip.generateAsync({ type: 'nodebuffer' });

    // Write the modified ZIP file to the output path
    fs.writeFileSync(outputFilePath, modifiedZipData);

    console.log(`Replacements completed for ${inputFilePath}. Modified ZIP file saved at ${outputFilePath}`);
  } catch (error) {
    console.error(`An error occurred while processing ${inputFilePath}:`, error);
  }
}

// Command-line arguments
const [nodePath, scriptPath, inputDirectory, outputDirectory, domain] = process.argv;

// Check if all required arguments are provided
if (!inputDirectory || !outputDirectory || !domain) {
  console.error('Usage: node script.js <inputDirectory> <outputDirectory> <domain>');
  process.exit(1);
}

performReplacementsInDirectory(inputDirectory, outputDirectory, domain);


//example usage - node index.js ./caregiver_english ./caregiver_english_modified https://scout.sutterhealth.org/

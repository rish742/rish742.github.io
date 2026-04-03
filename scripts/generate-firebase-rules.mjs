import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const envPath = path.join(cwd, '.env');
const fallbackEmail = 'replace-me@example.com';

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const source = fs.readFileSync(filePath, 'utf8');
  return source.split(/\r?\n/).reduce((accumulator, line) => {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) {
      return accumulator;
    }

    const [key, ...rest] = line.split('=');
    accumulator[key.trim()] = rest.join('=').trim();
    return accumulator;
  }, {});
}

const fileEnv = readEnvFile(envPath);
const allowedEmail =
  process.env.PUBLIC_ALLOWED_ADMIN_EMAIL ||
  fileEnv.PUBLIC_ALLOWED_ADMIN_EMAIL ||
  fallbackEmail;

const normalizedAllowedEmail = allowedEmail.toLowerCase();

const replacements = {
  '__ALLOWED_ADMIN_EMAIL__': normalizedAllowedEmail,
};

for (const fileName of ['firestore.rules', 'storage.rules']) {
  const templatePath = path.join(cwd, `${fileName}.template`);
  const outputPath = path.join(cwd, fileName);
  const template = fs.readFileSync(templatePath, 'utf8');
  const content = Object.entries(replacements).reduce(
    (output, [token, value]) => output.replaceAll(token, value),
    template,
  );

  fs.writeFileSync(outputPath, content);
}

if (normalizedAllowedEmail === fallbackEmail) {
  console.warn(
    '[firebase:rules] PUBLIC_ALLOWED_ADMIN_EMAIL was not set. Generated rules use a placeholder email.'
  );
}

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function readPluginMetadata(relativePath) {
  const contents = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const openingTag = contents.match(/<plugin\b[\s\S]*?>/);

  if (!openingTag) {
    throw new Error(`Could not find the <plugin> element in ${relativePath}`);
  }

  const id = openingTag[0].match(/\bid="([^"]+)"/);
  const version = openingTag[0].match(/\bversion="([^"]+)"/);

  if (!id || !version) {
    throw new Error(`Could not read plugin id and version from ${relativePath}`);
  }

  return { id: id[1], version: version[1] };
}

const plugin = readPluginMetadata('plugin.xml');
const testsPlugin = readPluginMetadata('tests/plugin.xml');
const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
const expectedTag = `v${packageJson.version}`;
const failures = [];

if (packageJson.cordova.id !== plugin.id) {
  failures.push(
    `package.json cordova.id (${packageJson.cordova.id}) does not match plugin.xml id (${plugin.id})`
  );
}

if (packageJson.version !== plugin.version) {
  failures.push(
    `package.json version (${packageJson.version}) does not match plugin.xml version (${plugin.version})`
  );
}

if (packageJson.version !== testsPlugin.version) {
  failures.push(
    `package.json version (${packageJson.version}) does not match tests/plugin.xml version (${testsPlugin.version})`
  );
}

if (!changelog.includes(`<a name="${packageJson.version}"></a>`)) {
  failures.push(`CHANGELOG.md does not contain an entry for ${packageJson.version}`);
}

if (!changelog.includes(`releases/tag/${expectedTag}`)) {
  failures.push(`CHANGELOG.md does not link to release tag ${expectedTag}`);
}

if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== expectedTag) {
  failures.push(
    `Git tag (${process.env.GITHUB_REF_NAME}) does not match package version (${expectedTag})`
  );
}

if (failures.length > 0) {
  console.error('Release validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Release ${expectedTag} is internally consistent.`);

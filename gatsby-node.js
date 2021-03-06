const path = require('path');
const fs = require('fs');

const packageManifest = require('./package.json');
const { gatsby: version } = packageManifest.dependencies

const calls = {};

const check = (key, next) => {
  if (calls[key]) return;
  calls[key] = true;
  next?.(key);
};

const logFilename = `gatsby-${version}-lifecycle-${process.env.NODE_ENV}.log`;
const logPath = path.resolve('archives', logFilename);
fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.writeFileSync(logPath, '');

const appendLog = value => {
  fs.appendFileSync(logPath, value + '\n', 'utf8');
};

// All hooks documented at https://www.gatsbyjs.com/docs/node-apis/
exports.createPages = () => check('createPages', appendLog);
exports.createPagesStatefully = () => check('createPagesStatefully', appendLog);
exports.createResolvers = () => check('createResolvers', appendLog);
exports.createSchemaCustomization = () => check('createSchemaCustomization', appendLog);
exports.generateSideEffects = () => check('generateSideEffects', appendLog);
exports.onCreateBabelConfig = () => check('onCreateBabelConfig', appendLog);
exports.onCreateDevServer = () => check('onCreateDevServer', appendLog);
exports.onCreateNode = () => check('onCreateNode', appendLog);
exports.onCreatePage = () => check('onCreatePage', appendLog);
exports.onCreateWebpackConfig = () => check('onCreateWebpackConfig', appendLog);
exports.onPostBootstrap = () => check('onPostBootstrap', appendLog);
exports.onPostBuild = () => check('onPostBuild', appendLog);
exports.onPreBootstrap = () => check('onPreBootstrap', appendLog);
exports.onPreBuild = () => check('onPreBuild', appendLog);
exports.onPreExtractQueries = () => check('onPreExtractQueries', appendLog);
exports.onPreInit = () => check('onPreInit', appendLog);
exports.pluginOptionsSchema = () => check('pluginOptionsSchema', appendLog);
exports.preprocessSource = () => check('preprocessSource', appendLog);
exports.resolvableExtensions = () => check('resolvableExtensions', appendLog);
exports.setFieldsOnGraphQLNodeType = () => check('setFieldsOnGraphQLNodeType', appendLog);
exports.sourceNodes = () => check('sourceNodes', appendLog);
exports.unstable_shouldOnCreateNode = () => check('unstable_shouldOnCreateNode', appendLog);

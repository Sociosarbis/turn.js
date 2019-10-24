const path = require('path')
module.exports = {
  entry: path.resolve(__dirname, './turn.js'),
  output: {
    path: path.resolve(__dirname),
    filename: 'turn.bundle.js',
    library: 'Turn',
    libraryTarget: 'umd'
  }
}
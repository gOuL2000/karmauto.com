
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === 'better-sqlite3') {
        pkg.scripts = pkg.scripts || {};
        // Ensure build scripts are not ignored
        if (!pkg.scripts['install']) {
          pkg.scripts['install'] = 'node-gyp rebuild';
        }
      }
      return pkg;
    }
  }
};

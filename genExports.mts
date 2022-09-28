#!/usr/bin/env tsx
/*

Script that renders exports for Vite compatibility.
May also be useful for ES Modules package.json generation.

# Instructions

optional: Customize the TROOT to match destination paths.

1. Save as `genExports.mts`, the extension is important
1. Place on root of primevue 2.x project
2. Execute with `npx tsx genExports.mts`
3. Results will be inside PKG_JSON, in the excludes field.


# Bonus

1. Add `.js` extensions to ToastService.js and all js files in `/utils`. 
2. With Code find `(import .* '\./)([A-Z][A-z]*)'` and replace it with `$1$2.vue'`
3. build the css and export that too
4. run `npx gulp build-resources`
5. add `"./resources/*": "./dist/resources/*",` to exports
6. Fixup .npmignore to include dist

*/

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'

const PKG_JSON = 'package.json'
const CROOT = 'src/components'
const TROOT = '.' // targets will be relative to this

const forceInclude = ['nuxt/index.js', 'config/PrimeVue.vue']
const exclude = ['nuxt', 'config', 'common']
const componentDirsRaw = await readdir(CROOT)
const componentDirs = componentDirsRaw.filter(c => !exclude.includes(c))
const nComponentsExcluded = componentDirsRaw.length - componentDirs.length
const componentDirs2 = []
const componentDirs3 = []

const vueComponents = []
const jsComponents = []
const forcedComponents = []
const componentsFound = []

// ls.filter(f => f.endsWith('.vue'))

for (const cDir of componentDirs) {
  const files = await readdir(CROOT + '/' + cDir)
  for (const f of files) {
    const a = f.split('.')
    if (a.at(-1) === 'vue' && a.at(-2)?.toLowerCase() === cDir) {
      const file = resolve(`${CROOT}/${cDir}/${f}`)
      vueComponents.push(file)
      componentsFound.push(cDir)
      break
    } else if (files.at(-1) === f) { // last one
      componentDirs2.push(cDir)
    }
  }
}

for (const jsDir of componentDirs2) {
  const files = await readdir(CROOT + '/' + jsDir)
  for (const f of files) {
    const a = f.split('.')
    if (a.at(-1) === 'js' && a.at(-2)?.toLowerCase() === jsDir) {
      const file = resolve(`${CROOT}/${jsDir}/${f}`)
      jsComponents.push(file)
      componentsFound.push(jsDir)
      break
    } else if (files.at(-1) === f) { // last one
      componentDirs3.push(jsDir)
    }
  }
}

for (const fPath of forceInclude) {
  const file = resolve(`${CROOT}/${fPath}`)
  forcedComponents.push(file)
}

// Report
const missingComponents = componentDirs3.map(m => `  "${m}"`).join('\n')
const nComponentsFound = componentsFound.length + nComponentsExcluded
console.log(`
# Component report:

  Total component roots: ${componentDirsRaw.length}
  Vue components found: ${vueComponents.length}
  Secondary component roots: ${componentDirs2.length}
  JS components found: ${jsComponents.length}
  Components excluded: ${nComponentsExcluded}
  Total Components found: ${nComponentsFound}
`)

if (nComponentsFound !== componentDirsRaw.length) {
  console.log(`# Components still missing:\n\n${missingComponents}`)
}

const exportsArr = [...vueComponents, ...jsComponents, ...forcedComponents].map(v => {
  const linkName = './' + relative(CROOT, v).split('/').at(0)
  const target = './' + relative(TROOT, v)
  return [linkName, target]
})
const exports = Object.fromEntries(exportsArr)
const pkgRaw = await readFile(PKG_JSON, 'utf8')
const pkg = JSON.parse(pkgRaw)
pkg.exports = exports

const pkgOutput = JSON.stringify(pkg, null, 2)
writeFile(PKG_JSON, pkgOutput, 'utf8')
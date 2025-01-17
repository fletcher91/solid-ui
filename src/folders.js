/**      UI To Delete Folder and content
*
*/
/* global confirm */
const UI = {
  icons: require('./iconBase'),
  log: require('./log'),
  ns: require('./ns'),
  pad: require('./'),
  rdf: require('rdflib'),
  store: require('./store'),
  widgets: require('./widgets'),
  utils: require('./utils')
}

const ns = UI.ns

function deleteRecursive (kb, folder) {
  return new Promise(function (resolve, reject) {
    kb.fetcher.load(folder).then(function () {
      let promises = kb.each(folder, ns.ldp('contains')).map(file => {
        if (kb.holds(file, ns.rdf('type'), ns.ldp('BasicContainer'))) {
          return deleteRecursive(kb, file)
        } else {
          console.log('deleteRecirsive file: ' + file)
          if (!confirm(' Really DELETE File ' + file)) {
            throw new Error('User aborted delete file')
          }
          return kb.fetcher.webOperation('DELETE', file.uri)
        }
      })
      console.log('deleteRecirsive folder: ' + folder)
      if (!confirm(' Really DELETE folder ' + folder)) {
        throw new Error('User aborted delete file')
      }
      promises.push(kb.fetcher.webOperation('DELETE', folder.uri))
      Promise.all(promises).then(res => { resolve() })
    })
  })
}

/** Iterate over files depth first
 *
 * @param folder - The folder whose contents we iterate over
 * @param store - The quadstore
 * @param action - returns a promise.  All the promises must be resolved
 */
function forAllFiles (folder, kb, action) {
  return new Promise(function (resolve, reject) {
    kb.fetcher.load(folder).then(function () {
      let promises = kb.each(folder, ns.ldp('contains')).map(file => {
        if (kb.holds(file, ns.rdf('type'), ns.ldp('BasicContainer'))) {
          return forAllFiles(file, kb, action)
        } else {
          return action(file)
        }
      })
      promises.push(action(folder))
      Promise.all(promises).then(res => { resolve() })
    })
  })
}

module.exports.deleteRecursive = deleteRecursive

/** Delete Folder and contents
*
 * @param {NamedNode} folder - The LDP container to be deleted
 * @param {DOMElement} containingElement - Where to put the user interface
 * @param {IndexedForumula} store - Quadstore (optional)
 * @param {Document} dom - The browser 'document' gloabl or equivalent (or iuse global)
 * @returns {DOMElement} - The control which has eben inserted in the
*/
/* global document */
module.exports.deleteFolder = function (folder, store, dom) {
  store = store || UI.store
  if (typeof docuent !== 'undefined') {
    dom = dom || document
  }
  const div = dom.createElement('div')
  const table = div.appendChild(dom.createElement('table'))
  const mainTR = table.appendChild(dom.createElement('tr'))
  mainTR.appendChild(dom.createElement('td')) // mainTD

  const p = mainTR.appendChild(dom.createElement('p'))
  p.textContent = `Are you sure you want to delete the folder ${folder}? This cannot be undone.`
  const buttonsTR = table.appendChild(dom.createElement('tr'))
  const buttonsTD1 = buttonsTR.appendChild(dom.createElement('td'))
  buttonsTR.appendChild(dom.createElement('td')) // buttonsTD2
  const buttonsTD3 = buttonsTR.appendChild(dom.createElement('td'))

  let cancel = buttonsTD1.appendChild(UI.widgets.cancelButton(dom))
  cancel.addEventListener('click', function (e) {
    div.parentNode.removeChild(div)
  }, false)

  let doit = buttonsTD3.appendChild(UI.widgets.button(UI.icons.iconBase + 'noun_925021.svg', 'Yes, delete'))
  doit.addEventListener('click', function (e) {
    deleteThem(folder).then(() => {
      console.log('All deleted.')
    })
  }, false)

  function deleteThem (folder) {
    return forAllFiles(folder, (file) => store.fetcher.webOperation('DELETE', file.uri))
  }
  var count = 0
  forAllFiles(folder, store, () => { count += 1 }) // Count files
  .then(() => {
    let msg = ' Files to delete: ' + count
    console.log(msg)
    p.textContent += msg
  })

  return div
}

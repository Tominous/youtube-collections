'use strict'

function _getSubscriptionContainer() {
  return document.getElementById('subscription-manager-container')
}

Promise.all([
  __collections,
  __subscriptions
]).then(valueArr => {
  var collections = valueArr[0]
  var subscriptions = valueArr[1]

  template.render('manager-section',{ quantity: Object.keys(collections).length }).then(html => {
    var elem = document.createElement('div')
    _getSubscriptionContainer().parentNode.insertBefore(elem,_getSubscriptionContainer())
    elem.outerHTML = html

    return document.getElementById('collections-manager-container')
  }).then(node => {
    var form = document.getElementById('add-collection-form')

    node.addEventListener('click',e => {
      if(e.target.hasAttribute('data-collection-id')) {
        var removedId = e.target.dataset.collectionId
        if(window.confirm('Remove collection '+ collections[removedId].name+'?')) {
          _removeCollection(e.target.dataset.collectionId)
        }
      }
    })

    form.querySelector('input[name="add-collection"]').addEventListener('input',e => {
      e.target.classList.toggle('invalid',!e.target.checkValidity() && e.target.value !== '')
    })

    form.querySelector('input[name="add-collection"]').addEventListener('invalid',e => {
      e.target.classList.add('invalid')
    })

    form.addEventListener('submit',e => {
      _addCollection(form.querySelector('input[name="add-collection"]').value)

      e.preventDefault()
      e.stopPropagation()
      return false
    })

    return document.querySelector('#collection-manager-list tbody')
  }).then(node => {
    return Object.keys(collections).map(id => {
      return template.render('manager-section-item',{
        id: id,
        name: collections[id].name
      }).then(html => {
        var elem = document.createElement('tr')
        node.appendChild(elem)
        elem.outerHTML = html
        return document.getElementById(id+'-manager-collection')
      })
    })
  })

  var buttons

  Promise.all(
    [template.render('manager-subscription-popup-item', { id: '', label: '' })].concat(
    Object.keys(collections).map(k => {
      return template.render('manager-subscription-popup-item', { id: k, label: collections[k].name })
    }))
  ).then(valueArr => {
    buttons = valueArr.join('')
    return Promise.all(Object.keys(collections).map(k => {
      return template.render('manager-subscription-button', { id: k, label: collections[k].name, buttons: buttons }).then(html => {
        return { [collections[k].name]: html }
      })
    }))
  })
  .then(valueArr => {
    return template.render('manager-subscription-button', { id: '', label: '', buttons: buttons }).then(html => {
      valueArr.push({'(none)':html})
      return valueArr.reduce((all,curr) => Object.assign(all,curr),{})
    })
  })
  .then(htmls => {
    let query = '#subscription-manager-list tr.subscription-item td:first-of-type .subscription-title-wrap'
    Array.prototype.slice.call(document.querySelectorAll(query))
    .map(node => {
      var channelId = node.closest('tr').dataset.channelExternalId
      var collection = subscriptions[channelId].collection
      var elem = document.createElement('div')
      node.appendChild(elem)

      if(collection === null) {
        elem.outerHTML = htmls['(none)']
      } else {
        elem.outerHTML = htmls[collection.name]
      }

      node.querySelector('.add-to-collection ul').setAttribute('data-subscription-id',channelId)
    })
  })
  .then(() => {
    window.addEventListener('click',e => {
      if(e.target.matches('ul[data-subscription-id] li button *')) {
        var collectionId = e.target.closest('li').dataset.collectionId
        var subscriptionid = e.target.closest('ul').dataset.subscriptionId

        if(collectionId === '') {
          _removeSubscription(subscriptionid)
        }
        else {
          _addSubscription(subscriptionid,collectionId)
        }
      }
    })
  })
})

__collections.then(collections => {
  window.addEventListener('message',e => {
    if (event.source != window) {
      return
    }

    var _getAddSubscriptionButton = function(subId) {
      return document.querySelector('#subscription-manager-list\
        tr[data-channel-external-id="'+subId+'"] .add-to-collection')
    }

    var _setButtonCollectionId = function(subId,collectionId) {
      _getAddSubscriptionButton(subId).setAttribute('data-collection-id',collectionId)
      var label = collectionId === '' ? '' : collections[collectionId].name
      _getAddSubscriptionButton(subId).querySelector('.collection-label-wrapper').textContent = label
    }
    console.log(e)

    if (event.data.type) {
      switch(event.data.type) {
        case 'SUBSCRIPTION_ADDED':
          _setButtonCollectionId(event.data.subscriptionId,event.data.collectionId)
          break;
        case 'SUBSCRIPTION_REMOVED':
          _setButtonCollectionId(event.data.subscriptionId,'')
          break;
        case 'SUBSCRIPTION_UPDATED':
          _setButtonCollectionId(event.data.subscriptionId,event.data.newValue)
          break;
        case 'COLLECTION_ADDED':
          break;
        case 'COLLECTION_REMOVED':
          break;
      }
    }
  })
})
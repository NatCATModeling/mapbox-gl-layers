var yo = require('yo-yo')
var Control = require('mapbox-gl/js/ui/control/control')

module.exports = Layers

/**
 * Creates a layer toggle control
 * @param {Object} [options]
 * @param {Object} [options.layers] An object determining which layers to include in the toggle.  Each key is a display name (what's shown in the UI), and each value is the corresponding layer id in the map style.
 * @param {string} [options.position='top-right'] A string indicating position on the map. Options are `top-right`, `top-left`, `bottom-right`, `bottom-left`.
 * @example
 * (new Layers({ 'National Parks': 'national_park', 'Other Parks': 'parks' })).addTo(map)
 */
function Layers (options) {
  this.options = Object.assign({}, this.options, options)
  if (options.layers) {
    // normalize layers to arrays
    var layers = {}
    for (var k in this.options.layers) {
      layers[k] = Array.isArray(this.options.layers[k])
        ? this.options.layers[k] : [this.options.layers[k]]
    }
    this.options.layers = layers
  }

  this._onClick = this._onClick.bind(this)
  this._isActive = this._isActive.bind(this)
  this._layerExists = this._layerExists.bind(this)
  this._update = this._update.bind(this)
}

Layers.prototype = Object.create(Control.prototype)
Layers.prototype.constructor = Layers
Layers.prototype.options = { position: 'top-right' }
Layers.prototype.onAdd = function onAdd (map) {
  this._map = map
  var style = map.getStyle()
  this._allLayers = style.layers.map((layer) => layer.id)
  if (!this.options.layers) {
    this.options.layers = {}

    // if there's Mapbox Studio metadata available, use any groups we can find
    var groups = {}
    if (style.metadata && style.metadata['mapbox:groups']) {
      groups = style.metadata['mapbox:groups']
      Object.keys(groups).forEach((g) => { this.options.layers[groups[g].name] = [] })
    }

    style.layers.forEach((layer) => {
      var group = layer.metadata ? groups[layer.metadata['mapbox:group']] : null
      if (layer.metadata && group) {
        this.options.layers[group.name].push(layer.id)
      } else {
        this.options.layers[layer.id] = [layer.id]
      }
    })
  }
  this._map.on('style.change', this._update)
  this._map.style.on('layer.remove', this._update)
  this._map.style.on('layer.add', this._update)
  return this._render()
}

Layers.prototype.onRemove = function onRemove () {
  this._map.off('style.change', this._update)
  this._map.style.off('layer.remove', this._update)
  this._map.style.off('layer.add', this._update)
}

Layers.prototype._update = function _update () {
  this._allLayers = this._map.getStyle().layers.map((layer) => layer.id)
  yo.update(this._container, this._render())
}
Layers.prototype._render = function _render () {
  var layers = this.options.layers
  var className = 'mapboxgl-layers'
  return yo`
  <div class="${className}">
    <ul>
    ${Object.keys(layers)
      .filter((name) => layers[name].some(this._layerExists))
      .map((name) => {
        var ids = layers[name].filter(this._layerExists)
        var className = ids.every(this._isActive) ? 'active'
          : ids.some(this._isActive) ? 'active partially-active'
          : ''
        return yo`
        <li data-layer-id=${ids.join(',')} class=${className} onclick=${this._onClick}>
          ${name}
        </li>`
      })}
    </ul>
  </div>
  `
}

Layers.prototype._onClick = function _onClick (e) {
  var ids = e.currentTarget.getAttribute('data-layer-id').split(',')
    .filter(this._layerExists)
  var visibility = ids.some(this._isActive) ? 'none' : 'visible'
  ids.forEach((id) => {
    this._map.setLayoutProperty(id, 'visibility', visibility)
  })
}

Layers.prototype._isActive = function isActive (id) {
  return this._map.getLayoutProperty(id, 'visibility') === 'visible'
}

Layers.prototype._layerExists = function (id) {
  return this._allLayers.indexOf(id) >= 0
}


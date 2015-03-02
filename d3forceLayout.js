;(function($$) { 'use strict';

  var defaults = {
    nTicks: 300,
    maxSimulationTime: 6000, // ms
    infinite: false,
    animate: true,
    refresh: 1, // ticks per frame
    charge: -30, // constant or function
    linkDistance: 20, // constant or function
    linkStrength: 1, // constant or function
    gravity: 0.1,
    friction: 0.9,
    theta: 0.8,
    alpha: 0.1,
    zoom: undefined,
    pan: undefined,
    fit: false,
    padding: 20,
    ready: undefined, // callback on layoutready
    stop: undefined // callback on layoutstop
  };

  function D3ForceLayout( options ) {
    this.options = $$.util.extend(true, {}, defaults, options);
  }

  D3ForceLayout.prototype.stop = function() {
    this.stopped = true;
    return this; // chaining
  };

  D3ForceLayout.prototype.run = function() {
    var options = this.options;
    var cy      = options.cy;
    var layout  = this;
    var w = cy.width();
    var h = cy.height();

    options.refresh = options.animate ? Math.max(1, options.refresh) : 25;

    var cyNodes = options.eles.nodes() || [];
    var cyEdges = options.eles.edges() || [];

    var nodesIndexed = {};
    var nodes = [];
    cyNodes.forEach(function(node) {
      nodesIndexed[node._private.data.id] = node._private.position;
      nodes.push(node._private.position);
    });
    var links = [];
    links = cyEdges.map(function(e) {
      return {
        source: nodesIndexed[e._private.data.source],
        target: nodesIndexed[e._private.data.target],
        cyEdge: e};
    });

    layout.stopped = false;
    layout.ready = false;
    layout.startTime = Date.now();
    layout.totalTicks = options.nTicks;
    layout.ticksDone = 0;
    layout.force = d3.layout.force()
      .nodes(nodes)
      .links(links)
      .charge($$.is.fn(options.charge) ?
        function(n, i) {
          return options.charge.apply(cyNodes[i], [cyNodes[i], i])
        }
        : options.charge)
      .linkDistance($$.is.fn(options.linkDistance) ?
        function(l, i) {
          return options.linkDistance.apply(l.cyEdge, [l.cyEdge, i])
        }
        : options.linkDistance)
      .linkStrength($$.is.fn(options.linkStrength) ?
        function(l, i) {
          return options.linkStrength.apply(l.cyEdge, [l.cyEdge, i])
        }
        : options.linkStrength)
      .size([w, h])
      .gravity(options.gravity)
      .friction(options.friction)
      .theta(options.theta)
      .alpha(options.alpha);

    var end = function() {
      if( options.zoom ) {
        cy.zoom( options.zoom );
      }

      if( options.pan ) {
        cy.pan( options.pan );
      }

      if( options.fit ) {
        cy.fit( options.padding );
      }

      console.info('Layout took ' + (Date.now() - layout.startTime) + ' ms');

      // Layout has finished
      layout.one('layoutstop', options.stop);
      layout.trigger({ type: 'layoutstop', layout: layout });
    }

    var ticksBatch = function() {
      if(layout.stopped || ((layout.ticksDone >= layout.totalTicks) && !options.infinite)
          || ((Date.now() > layout.startDate + options.maxSimulationTime) && !options.infinite)) {
        layout.force.stop();
        end();
        return;
      }

      for(var i = 0; i < options.refresh; i++, layout.ticksDone++) {
        if(!options.infinite && layout.ticksDone > layout.totalTicks) {
          break;
        }
        layout.force.tick();
      }

      if(options.animate) {
        if( options.fit ) {
          cy.fit( options.padding );
        }
        else {
          cy.forceRender();
        }
      }

      // Trigger layoutReady only once
      if(!layout.ready) {
        layout.ready = true;
        layout.one('layoutready', options.ready);
        layout.trigger({ type: 'layoutready', layout: layout });
      }

      $$.util.requestAnimationFrame(ticksBatch);
    }

    layout.trigger({ type: 'layoutstart', layout: layout });
    layout.force.start();
    $$.util.requestAnimationFrame(ticksBatch);

    return this; // chaining
  };

  $$('layout', 'd3force', D3ForceLayout);

})(cytoscape);
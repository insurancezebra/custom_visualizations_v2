const vis = {
  id: "dev_vega_visual_test",
  label: "Dev - Test Vega Visual - Top K Chart",
  options: {
    k_range_min: {
      label: 'Range Minimum',
      type: 'number',
      default: 5
    },
    k_range_max: {
      label: 'Range Maximum',
      type: 'number',
      default: 20
    },
    spec: {
      "$schema": "https://vega.github.io/schema/vega/v4.json",
      "width": 500,
      "height": 410,
      "padding": 5,
      "autosize": "fit",

      "signals": [
        {
          "name": "k", "value": 10,
          "bind": {"input": "range", "min": 5, "max": 20, "step": 1}
        },
      ],

      "title": {
        "text": "",
        "orient": "top",
        "anchor": "start"
      },

      "marks": [
        {
          "type": "rect",
          "from": {"data": "Looker_Data"},
          "encode": {
            "update": {
              "x": {"scale": "x", "value": 0},
              "x2": {"scale": "x", "field": ""},
              "y": {"scale": "y", "field": ""},
              "height": {"scale": "y", "band": 1}
            }
          }
        }
      ],

      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": {"data": "Looker_Data", "field": ""},
          "range": "width",
          "nice": true
        },
        {
          "name": "y",
          "type": "band",
          "domain": {
            "data": "Looker_Data", "field": "",
            "sort": {"op": "max", "field": "", "order": "descending"}
          },
          "range": "height",
          "padding": 0.1
        }
      ],

      "axes": [
        {
          "scale": "x",
          "orient": "bottom",
          "format": ",d",
          "tickCount": 5
        },
        {
          "scale": "y",
          "orient": "left"
        }
      ]
    },
  },
  prepareData: function(data, queryResponse) {
    // get fields selected by user and map to their values
    let fields = queryResponse.fields.dimension_like.concat(queryResponse.fields.measure_like);
    return data.map(function(d) {
      return fields.reduce(function(acc, cur) {
        acc[cur.label_short] = d[cur.name].value;
        return acc
      }, {});
    })
  },

  // user with filter() to reduce array of keys to their distinct values
  reduceKeys: function(value, index, self) {
    return self.indexOf(value) === index;
  },

  // prepare the spec document with data chosen by user
  prepareChartArea: function(jsonData) {
    // check number of dimensions & measures selected are appropriate to the graph
    if (Object.keys(jsonData[0]).length > 2) {
      this.addError({title: "Too many dimensions/measures", message: "This chart handles 1 dimension and 1 measures."});
    } if (Object.keys(jsonData[0]).length < 2) {
      this.addError({title: "Too few dimensions/measures", message: "This chart handles 1 dimension and 1 measures."});
    } else {
      // set x & y for vega marks
      this.options.spec.marks[0].encode.update.x2.field = Object.keys(jsonData[0])[1];
      this.options.spec.marks[0].encode.update.y.field = Object.keys(jsonData[0])[0];

      // set x & y for the vega scales
      this.options.spec.scales[0].domain.field = Object.keys(jsonData[0])[1];
      this.options.spec.scales[1].domain.field = Object.keys(jsonData[0])[0];

      // set sort field for y scale
      this.options.spec.scales[1].domain.sort.field = Object.keys(jsonData[0])[1];

      this.options.spec.title.text = `Top ${this.options.spec.marks[0].encode.update.y.field} by ${this.options.spec.marks[0].encode.update.x2.field}`;
    }
  },

  // Set up the initial state of the visualization
  create(element, config) {
    let vegaVisual = document.createElement('script');
    vegaVisual.innerHTML = `
        const initSpec = ${JSON.stringify(this.options.spec)};
        vegaEmbed('#vis', initSpec, {defaultStyle: true}).catch(console.warn);`;

    element.parentNode.appendChild(vegaVisual);
  },
  // Render in response to the data or settings changing
  updateAsync(data, element, config, queryResponse, details, done) {

    // Clear any errors from previous updates
    this.clearErrors();

    // some errors and exit if the shape of the data isn't what this chart needs
    if (queryResponse.fields.dimensions.length == 0) {
      this.addError({title: "No Dimensions", message: "This chart requires dimensions."});
      return;
    }

    // prepare data user places into pivot table
    let jsonData = this.prepareData(data, queryResponse);

    // add formatted data to the vega spec
    this.options.spec.data = {
          "name": "Looker_Data",
          "values": jsonData,
          "transform": [
            {
              "type": "window",
              "sort": {"field": "Gross", "order": "descending"},
              "ops": ["row_number"], "as": ["rank"]
            },
            {
              "type": "filter",
              "expr": "datum.rank <= k"
            }
          ]
    };
    this.prepareChartArea(jsonData);
    const updateSpec = this.options.spec;
    vegaEmbed('#vis', updateSpec, {defaultStyle: true}).catch(console.warn);

    this.options.spec.signals[0].bind.min = config.k_range_min;
    this.options.spec.signals[0].bind.max = config.k_range_max;
    // We are done rendering! Let Looker know.
    done()
  }
}
looker.plugins.visualizations.add(vis);

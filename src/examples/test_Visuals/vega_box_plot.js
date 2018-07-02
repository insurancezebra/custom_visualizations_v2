const vis = {
  // Id and Label are legacy properties that no longer have any function besides documenting
  // what the visualization used to have. The properties are now set via the manifest
  // form within the admin/visualizations page of Looker
  id: "dev_vega_visual_test",
  label: "Dev - Test Vega Visual - Box Plot",
  options: {
    spec: {
      "$schema": "https://vega.github.io/schema/vega/v4.json",
      "width": 500,
      "padding": 5,

      "config": {
        "axisBand": {
          "bandPosition": 1,
          "tickExtra": true,
          "tickOffset": 0
        }
      },

      "signals": [
        { "name": "fields",
          "value": [] },
        { "name": "plotWidth", "value": 60 },
        { "name": "height", "update": "(plotWidth + 10) * length(fields)"}
      ],

      "scales": [
        {
          "name": "layout",
          "type": "band",
          "range": "height",
          "domain": {"data": "data", "field": "value"}
        },
        {
          "name": "xscale",
          "type": "linear",
          "range": "width", "round": true,
          "domain": {"data": "data", "field": "value"},
          "zero": true, "nice": true
        },
        {
          "name": "color",
          "type": "ordinal",
          "range": "category"
        }
      ],

      "axes": [
        {"orient": "bottom", "scale": "xscale", "zindex": 1},
        {"orient": "left", "scale": "layout", "tickCount": 5, "zindex": 1}
      ],

      "marks": [
        {
          "type": "group",
          "from": {
            "facet": {
              "data": "data",
              "name": "key",
              "groupby": "key"
            }
          },

          "encode": {
            "enter": {
              "yc": {"scale": "layout", "field": "key", "band": 0.5},
              "height": {"signal": "plotWidth"},
              "width": {"signal": "width"}
            }
          },

          "data": [
            {
              "name": "summary",
              "source": "key",
              "transform": [
                {
                  "type": "aggregate",
                  "fields": [],
                  "ops": ["min", "q1", "median", "q3", "max"],
                  "as": ["min", "q1", "median", "q3", "max"]
                }
              ]
            }
          ],

          "marks": [
            {
              "type": "rect",
              "from": {"data": "summary"},
              "encode": {
                "enter": {
                  "fill": {"value": "black"},
                  "height": {"value": 1}
                },
                "update": {
                  "yc": {"signal": "plotWidth / 2", "offset": -0.5},
                  "x": {"scale": "xscale", "field": "min"},
                  "x2": {"scale": "xscale", "field": "max"}
                }
              }
            },
            {
              "type": "rect",
              "from": {"data": "summary"},
              "encode": {
                "enter": {
                  "fill": {"value": "steelblue"},
                  "cornerRadius": {"value": 4}
                },
                "update": {
                  "yc": {"signal": "plotWidth / 2"},
                  "height": {"signal": "plotWidth / 2"},
                  "x": {"scale": "xscale", "field": "q1"},
                  "x2": {"scale": "xscale", "field": "q3"}
                }
              }
            },
            {
              "type": "rect",
              "from": {"data": "summary"},
              "encode": {
                "enter": {
                  "fill": {"value": "aliceblue"},
                  "width": {"value": 2}
                },
                "update": {
                  "yc": {"signal": "plotWidth / 2"},
                  "height": {"signal": "plotWidth / 2"},
                  "x": {"scale": "xscale", "field": "median"}
                }
              }
            }
          ]
        }
      ]
    },
  },

  prepareData: function(data, queryResponse) {
    let fields = queryResponse.fields.dimension_like.concat(queryResponse.fields.measure_like);
    return data.map(function(d) {
      return fields.reduce(function(acc, cur) {
        acc[cur.label_short] = d[cur.name].value;
        return acc
      }, {});
    })
  },

  reduceKeys: function(value, index, self) {
    return self.indexOf(value) === index;
  },

  prepareChartArea: function(jsonData) {
    if (Object.keys(jsonData[0]).length > 2) {
      this.addError({title: "Too many dimensions/measures", message: "This chart handles 2 dimensions."});
    }
    if (Object.keys(jsonData[0]).length < 2) {
      this.addError({title: "Too few dimensions/measures", message: "This chart handles 2 dimensions."});
    } else {
      // add field name signal and marks - data transform in vega spec
      console.log(this.options.spec.signals[0].value);
      Object.values(jsonData).map((d) => {
        this.options.spec.signals[0].value.push(Object.values(d)[0]);
      }, this);
      this.options.spec.marks[0].data[0].transform[0].fields = this.options.spec.signals[0].value.filter(this.reduceKeys);

      this.options.spec.signals[0].value = this.options.spec.marks[0].data[0].transform[0].fields
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
    this.options.spec.data = [{
      "name": "data",
      "values": jsonData,
      "transform": [
        {
          "type": "fold",
          "fields": {"signal": "fields"},
          "as": ["key", "value"]
        }
      ]
    }];

    this.prepareChartArea(jsonData);

    console.log(this.options.spec.signals[0].value)

    const updateSpec = this.options.spec
    vegaEmbed('#vis', updateSpec, {defaultStyle: true}).catch(console.warn);

    // We are done rendering! Let Looker know.
    done()
  }
}
looker.plugins.visualizations.add(vis);

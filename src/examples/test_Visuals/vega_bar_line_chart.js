const vis = {
  id: "dev_vega_visual_test",
  label: "Dev - Test Vega Visual - Bar + Line",
  options: {
    spec: {
      "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
      "layer": [
        {
          "mark": "bar",
          "encoding": {
            "x": {
              "field": "",
              "type": "ordinal"
            },
            "y": {
              "field": "",
              "type": "quantitative",
              "axis": {
                "grid": false
              }
            }
          }
        },
        {
          "mark": "line",
          "encoding": {
            "x": {
              "field": "date",
              "type": "ordinal"
            },
            "y": {
              "field": "temp_max",
              "type": "quantitative",
              "axis": {
                "grid": false
              },
              "scale": {"zero": false}
            },
            "color": {"value": "firebrick"}
          }
        }
      ],
      "resolve": {"scale": {"y": "independent"}}
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
    if (Object.keys(jsonData[0]).length > 3) {
      this.addError({title: "Too many dimensions/measures", message: "This chart handles 1 dimension and 2 measures."});
    } if (Object.keys(jsonData[0]).length < 3) {
      this.addError({title: "Too few dimensions/measures", message: "This chart handles 1 dimension and 2 measures."});
    } else {
      console.log(Object.keys(jsonData[0])[0]);
      // set x & y for the bar graph
      this.options.spec.layer[0].encoding.x.field = Object.keys(jsonData[0])[0];
      this.options.spec.layer[0].encoding.y.field = Object.keys(jsonData[0])[1];

      // set x & y for the line graph
      this.options.spec.layer[1].encoding.x.field = Object.keys(jsonData[0])[0];
      this.options.spec.layer[1].encoding.y.field = Object.keys(jsonData[0])[2];
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
      "name": "data",
      "values": jsonData,
    };
    this.prepareChartArea(jsonData);
    console.log(this.options.spec);
    const updateSpec = this.options.spec;
    vegaEmbed('#vis', updateSpec, {defaultStyle: true}).catch(console.warn);

    // We are done rendering! Let Looker know.
    done()
  }
}
looker.plugins.visualizations.add(vis);

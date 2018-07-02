const vis = {
  // Id and Label are legacy properties that no longer have any function besides documenting
  // what the visualization used to have. The properties are now set via the manifest
  // form within the admin/visualizations page of Looker
  id: "dev_vega_visual_test",
  label: "Dev - Test Vega Visual - Bar Chart",
  options: {
    spec: {
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A simple bar chart with embedded data.",
    "width": 360,
    "encoding": {
      "x": {"field": "a", "type": "ordinal"},
      "y": {"field": "b", "type": "quantitative"},
      "tooltip": {"field": "b", "type": "quantitative"}
    },
    "mark": "bar",
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

  prepareChartArea: function(jsonData) {

    if (Object.keys(jsonData[0]).length > 2) {
      this.addError({title: "Too many dimensions/measures", message: "This chart handles 1 measure + 1 dimension."});
    } else {
      // add field name to x + y axis encoding
      this.options.spec.encoding.x.field = Object.keys(jsonData[0])[0];
      this.options.spec.encoding.y.field = Object.keys(jsonData[0])[1];

      // add field to tooltip
      this.options.spec.encoding.tooltip.field = Object.keys(jsonData[0])[1];

      // check first value of x axis
      let firstValueDim = Object.values(jsonData[0])[0];
      // check type and set in spec for dim (x axis)
      if (typeof(firstValueDim) == 'string') {
        this.options.spec.encoding.x.type = 'ordinal';
      } else {
        this.options.spec.encoding.x.type = 'quantitative';
      }

      let firstValueMeas = Object.values(jsonData[0])[1];
      // check type and set in spec for measure (y axis)
      if (typeof(firstValueMeas) == 'number') {
        this.options.spec.encoding.y.type = 'quantitative';
        this.options.spec.encoding.tooltip.type = 'quantitative';
      } else {
        this.options.spec.encoding.y.type = 'ordinal';
      }
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

    // set chart area encoding in vega spec
    this.prepareChartArea(jsonData);

    // add formatted data to the vega spec
    this.options.spec.data = {
      values: jsonData,
    };
    const updateSpec = this.options.spec
    vegaEmbed('#vis', updateSpec, {defaultStyle: true}).catch(console.warn);

    // We are done rendering! Let Looker know.
    done()
  }
}
looker.plugins.visualizations.add(vis);

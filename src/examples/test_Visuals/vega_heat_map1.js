const vis = {
  id: "dev_vega_visual_test",
  label: "Dev - Test Vega Visual - Heat Map",
  options: {
    spec: {
      "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
      "mark": "rect",
      "width": 750,
      "height": 500,
      "encoding": {
        "x": {
          "field": "",
          "type": ""
        },
        "y": {
          "field": "",
          "type": "",
        },
        "color": {
          "field": "",
          "type": "",
        }
      },
      "config": {
        "range": {
          "heatmap": {
            "scheme": "greenblue"
          }
        },
        "view": {
          "stroke": "transparent"
        }
      }
    },
  },

  // format data into vega friendly format
  prepareData: function(data, queryResponse) {
    // get fields selected by user and map to their values
    let fields = queryResponse.fields.dimension_like.concat(queryResponse.fields.measure_like);
    // format into vega friendly format, returns dict
    return data.map(function(d) {
      return fields.reduce(function(acc, cur) {
          acc[cur.label_short] = d[cur.name].value;
          return acc;
      }, {});
    })
  },

  // prepare vega spec with data chosen by user if necessary
  // check to see if measures / dimensions have been selected
  prepareChartArea: function(jsonData) {
    if (Object.keys(jsonData[0]).length > 3) {
      this.addError({title: "Too many dimensions/measures", message: "This chart handles 2 dimensions and 1 measure."});
    } if (Object.keys(jsonData[0]).length < 3) {
      this.addError({title: "Too few dimensions/measures", message: "This chart handles 2 dimensions and 1 measure."});
    } else {
        // set field and type for x axis in vega spec
        this.options.spec.encoding.x.field = Object.keys(jsonData[0])[0]
        this.options.spec.encoding.x.type = (typeof Object.values(jsonData[0])[0] == 'string') ? 'ordinal' : 'quantitative'


        // set field and type for y axis in vega spec
        this.options.spec.encoding.y.field = Object.keys(jsonData[0])[1]
        this.options.spec.encoding.y.type = (typeof Object.values(jsonData[0])[1] == 'string') ? 'ordinal' : 'quantitative'

        // set field and type for color in vega spec
        this.options.spec.encoding.color.field = Object.keys(jsonData[0])[2]
        this.options.spec.encoding.color.type = (typeof Object.values(jsonData[0])[2] == 'string') ? 'ordinal' : 'quantitative'
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
    this.options.spec.data = {"values": jsonData};

    // prepare vega spec
    this.prepareChartArea(jsonData);

    // get updated spec and use with vega embed
    const updateSpec = this.options.spec
    vegaEmbed('#vis', updateSpec, {defaultStyle: true}).catch(console.warn);
    console.log(this.options.spec);
    // We are done rendering! Let Looker know.
    done()
  }
}
looker.plugins.visualizations.add(vis);

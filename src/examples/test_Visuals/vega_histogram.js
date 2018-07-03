const vis = {
  id: "dev_vega_visual_test",
  label: "Dev - Test Vega Visual - Histogram",
  options: {
    spec: {
      "$schema": "https://vega.github.io/schema/vega/v4.json",
      "width": 500,
      "height": 350,
      "padding": 5,

      "signals": [
        { "name": "binOffset", "value": "",
          "bind": {"input": "range", "min": "", "max": ""} },
        { "name": "binStep", "value": "",
          "bind": {"input": "range", "min": "", "max": "", "step": ""} }
      ],

      "scales": [
        {
          "name": "xscale",
          "type": "linear",
          "range": "width",
        },
        {
          "name": "yscale",
          "type": "linear",
          "range": "height", "round": true,
          "domain": {"data": "binned", "field": "count"},
          "zero": true, "nice": true
        }
      ],

      "axes": [
        {"orient": "bottom", "scale": "xscale", "zindex": 1},
        {"orient": "left", "scale": "yscale", "tickCount": 5, "zindex": 1}
      ],

      "marks": [
        {
          "type": "rect",
          "from": {"data": "binned"},
          "encode": {
            "update": {
              "x": {"scale": "xscale", "field": "bin0"},
              "x2": {"scale": "xscale", "field": "bin1",
                 "offset": {"signal": "binStep > 0.02 ? -0.5 : 0"}},
              "y": {"scale": "yscale", "field": "count"},
              "y2": {"scale": "yscale", "value": 0},
              "fill": {"value": "steelblue"}
            },
            "hover": { "fill": {"value": "firebrick"} }
          }
        },
        {
          "type": "rect",
          "from": {"data": "points"},
          "encode": {
            "enter": {
              "x": {"scale": "xscale", "field": "u"},
              "width": {"value": 1},
              "y": {"value": 25, "offset": {"signal": "height"}},
              "height": {"value": 5},
              "fill": {"value": "steelblue"},
              "fillOpacity": {"value": 0.4}
            }
          }
        }
      ]
    },
  },

  // format data into vega friendly format
  prepareData: function(data, queryResponse) {
    // get fields selected by user and map to their values
    let fields = queryResponse.fields.dimension_like.concat(queryResponse.fields.measure_like);
    // format into vega friendly format, returns dict
    return data.map(function(d) {
      return fields.reduce(function(acc, cur) {
          acc[cur.label_short] = Number(d[cur.name].value);
          return acc;
      }, {});
    })
  },

  // prepare vega spec with data chosen by user if necessary
  // check to see if measures / dimensions have been selected
  prepareChartArea: function(jsonData) {
    if (Object.keys(jsonData[0]).length > 1) {
      this.addError({title: "Too many dimensions/measures", message: "This chart handles 1 dimension."});
    } else {
        // assign key to x field in vega spec
        let key = Object.keys(jsonData[0])[0];
        this.options.spec.marks[1].encode.enter.x.field = key;

        // get information about data (min, max, count etc) to set vega spec for histogram correctly
        let arrayValues = jsonData.reduce((acc, cur) => {
          acc.push(cur[key]);
          return acc;
        }, [])
        maxValue = Math.max(...arrayValues);
        minValue = Math.min(...arrayValues);
        numValues = arrayValues.length;

        // set range of values and default value for histogram in vega spec
        this.options.spec.signals[0].bind.min = minValue;
        this.options.spec.signals[0].bind.max = maxValue;
        this.options.spec.signals[0].value = (maxValue - minValue) / 2;

        // set step and default value for bins
        this.options.spec.signals[1].bind.min = 0;
        this.options.spec.signals[1].bind.max = numValues;
        this.options.spec.signals[1].value = numValues / 2;
        this.options.spec.signals[1].bind.step = numValues / 25;

        // set extent for data in vega spec
        this.options.spec.data[1].transform[0].extent = [minValue, maxValue];

        // set scales in vega spec
        this.options.spec.scales[0].domain = [minValue, maxValue];
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
    this.options.spec.data = [
      {
        "name": "points",
        "values": jsonData
      },
      {
        "name": "binned",
        "source": "points",
        "transform": [
          {
            "type": "bin", "field": Object.keys(jsonData[0])[0],
            "anchor": {"signal": "binOffset"},
            "step": {"signal": "binStep"},
            "nice": false
          },
          {
            "type": "aggregate",
            "key": "bin0", "groupby": ["bin0", "bin1"],
            "fields": ["bin0"], "ops": ["count"], "as": ["count"]
          }
        ]
      }
    ];

    // prepare vega spec
    this.prepareChartArea(jsonData);

    // get updated spec and use with vega embed
    const updateSpec = this.options.spec
    vegaEmbed('#vis', updateSpec, {defaultStyle: true}).catch(console.warn);

    // We are done rendering! Let Looker know.
    done()
  }
}
looker.plugins.visualizations.add(vis);

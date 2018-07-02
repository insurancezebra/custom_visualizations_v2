const vis = {
  id: "dev_vega_visual_test",
  label: "Dev - Test Vega Visual - Grouped Bar",
  options: {
    spec: {
      "$schema": "https://vega.github.io/schema/vega/v4.json",
      "width": 500,
      "height": 500,
      "padding": 10,

      "scales": [
        {
          "name": "yscale",
          "type": "band",
          "domain": {"data": "data", "field": "category"},
          "range": "height",
          "padding": 0.2
        },
        {
          "name": "xscale",
          "type": "linear",
          "domain": {"data": "data", "field": "value"},
          "range": "width",
          "round": true,
          "zero": true,
          "nice": true
        },
        {
          "name": "color",
          "type": "ordinal",
          "domain": {"data": "data", "field": "position"},
          "range": {"scheme": "category20"}
        }
      ],

      "axes": [
        {"orient": "left", "scale": "yscale", "tickSize": 0, "labelPadding": 4, "zindex": 1},
        {"orient": "bottom", "scale": "xscale"}
      ],

      "marks": [
        {
          "type": "group",

          "from": {
            "facet": {
              "data": "data",
              "name": "facet",
              "groupby": "category"
            }
          },

          "encode": {
            "enter": {
              "y": {"scale": "yscale", "field": "category"}
            }
          },

          "signals": [
            {"name": "height", "update": "bandwidth('yscale')"}
          ],

          "scales": [
            {
              "name": "pos",
              "type": "band",
              "range": "height",
              "domain": {"data": "facet", "field": "position"}
            }
          ],

          "marks": [
            {
              "name": "bars",
              "from": {"data": "facet"},
              "type": "rect",
              "encode": {
                "enter": {
                  "y": {"scale": "pos", "field": "position"},
                  "height": {"scale": "pos", "band": 1},
                  "x": {"scale": "xscale", "field": "value"},
                  "x2": {"scale": "xscale", "value": 0},
                  "fill": {"scale": "color", "field": "position"}
                }
              }
            },
            {
              "type": "text",
              "from": {"data": "bars"},
              "encode": {
                "enter": {
                  "x": {"field": "x2", "offset": -5},
                  "y": {"field": "y", "offset": {"field": "height", "mult": 0.5}},
                  "fill": {"value": "white"},
                  "align": {"value": "right"},
                  "baseline": {"value": "middle"},
                  "text": {"field": "datum.value"}
                }
              }
            }
          ]
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
        acc[cur.label_short] = d[cur.name].value;
        return acc
      }, {});
    })
  },

  // adjust data to work in conjunction with the grouped bar data spec, returns list
  groupedBarDataFix: function(data) {
    return data.reduce((a, c) => {
      values = Object.values(c);
      values.shift();
      let p = 0
      for (let x in values) {
        a.push({"category": Object.values(c)[0], "position": p, "value": values[x].toFixed(2)})
        p+=1
      }
      return a
      }, [])
    },

  // prepare vega spec with data chosen by user if necessary
  // check to see if measures / dimensions have been selected
  prepareChartArea: function(jsonData) {
    if (Object.keys(jsonData[0]).length < 2) {
      this.addError({title: "Too few dimensions/measures", message: "This chart handles 1 dimension and multiple measures."});
    } else {
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
    let groupedBarData = this.groupedBarDataFix(jsonData);

    // add formatted data to the vega spec
    this.options.spec.data = [{
      "name": "data",
      "values": groupedBarData,
    }];

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

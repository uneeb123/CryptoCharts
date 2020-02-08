import * as d3 from "d3";
import * as numeral from "numeral";
import * as d3Array from "d3-array";

const raceChart = {
  async init(data, svg, cryptoNames, marketCap) {
    const margin = ({
      top: 16,
      right: 6,
      bottom: 6,
      left: 0
    });
    const width = 1000;
    const labelWidth = 200;
    const duration = 300
    const n = 10
    const formatNumber = d3.format(",d")
    const barSize = 48
    const height = margin.top + barSize * n + margin.bottom

    let dateMap = {};
    cryptoNames.forEach(crypto => {
      marketCap[crypto].forEach(val => {
        const timestamp = new Date(val.date).getTime();
        if (!(timestamp in dateMap)) {
          dateMap[timestamp] = {};
        }
        dateMap[timestamp][crypto] = val.marketCap;
      })
    });
    let timestamps = Object.keys(dateMap).sort();
    let dateValues = timestamps.reduce((acc, curr) => {
      const date = new Date(parseInt(curr));
      acc.push([date, dateMap[curr]]);
      return acc;
    }, []);


    function extendKeyframes(dateValues, k) {
      function rank(value) {
        const data = Array.from(cryptoNames, name => ({
          name,
          value: value(name) || 0
        }));
        data.sort((a, b) => b.value - a.value);
        for (let i = 0; i < data.length; ++i) data[i].rank = Math.min(n, i);
        return data;
      }

      const keyframes = [];
      let ka, a, kb, b;
      for ([
          [ka, a],
          [kb, b]
        ] of d3.pairs(dateValues)) {
        for (let i = 0; i < k; ++i) {
          const t = i / k;
          keyframes.push([
            new Date(ka * (1 - t) + kb * t),
            rank(name => a[name] * (1 - t) + b[name] * t)
          ]);
        }
      }
      keyframes.push([new Date(kb), rank(name => b[name])]);
      return keyframes;
    }

    function skipKeyframes(dateValues, k) {
      const keyframes = [];
      dateValues.forEach(dateValue => {
        let toArray = [];
        cryptoNames.forEach(cryptoName => {
          toArray.push({
            name: cryptoName,
            value: dateValue[1][cryptoName] || 0
          });
        })
        toArray = toArray.filter(element => element.value > 0);
        toArray.sort((a, b) => b.value - a.value);
        toArray.forEach((element, i) => {
          element.rank = i;
        });
        keyframes.push([dateValue[0], toArray]);
      });
      const skippedFrames = [];
      for (let i = 0; i < keyframes.length; i++) {
        if (i % k === 0) {
          skippedFrames.push(keyframes[i]);
        }
      }
      return skippedFrames;
    }

    const keyframes = skipKeyframes(dateValues, 10);

    const nameframes = d3Array.groups(keyframes.flatMap(([, data]) => data), d => d.name)

    const prev = nameframes.flatMap(([, data]) => d3.pairs(data, (a, b) => [b, a]))

    const next = nameframes.flatMap(([, data]) => d3.pairs(data))

    const x = d3.scaleLinear().domain([0, 1000000000]).range([margin.left, width - margin.right]);

    const y = d3.scaleBand()
      .domain(d3.range(n + 1))
      .rangeRound([margin.top, margin.top + barSize * (n + 1 + 0.1)])
      .padding(0.1)

    const color = function () {
      const scale = d3.scaleOrdinal(d3.schemeCategory10);
      return d => scale(d.name);
    }();

    function bars(svg) {
      let bar = svg.append("g")
        .attr("fill-opacity", 0.6)
        .attr("transform", `translate(${labelWidth},0)`)
        .selectAll("rect");

      return ([date, data], transition) => bar = bar
        .data(data.slice(0, n), d => d.name)
        .join(
          enter => enter.append("rect")
          .attr("fill", color)
          .attr("height", y.bandwidth())
          .attr("x", x(0))
          .attr("y", d => y((prev[d] || d).rank))
          .attr("width", d => x((prev[d] || d).value) - x(0)),
          update => update,
          exit => exit.transition(transition).remove()
          .attr("y", d => y((next[d] || d).rank))
          .attr("width", d => x((next[d] || d).value) - x(0))
        )
        .call(bar => bar.transition(transition)
          .attr("y", d => y(d.rank))
          .attr("width", d => x(d.value) - x(0)));
    }

    function labels(svg) {
      let label = svg.append("g")
        .style("font", "bold 12px var(--sans-serif)")
        .style("font-variant-numeric", "tabular-nums")
        .attr("text-anchor", "end")
        .selectAll("text");

      return ([date, data], transition) => label = label
        .data(data.slice(0, n), d => d.name)
        .join(
          enter => enter.append("text")
          .attr("transform", d => `translate(${labelWidth},${y(d.rank)})`)
          .attr("y", y.bandwidth() / 2)
          .attr("x", -6)
          .text(d => d.name),
          update => update,
          exit => exit.transition(transition).remove()
          .attr("transform", d => `translate(${labelWidth},${y(d.rank)})`)
          //.call(g => g.select("tspan").tween("text", d => textTween(d.value, d.value)))
        )
        .call(bar => bar.transition(transition)
          .attr("transform", d => `translate(${labelWidth},${y(d.rank)})`))
      // .call(g => g.select("tspan").tween("text", d => textTween(d.value, d.value))));
    }

    function textTween(a, b) {
      const i = d3.interpolateNumber(a, b);
      return function (t) {
        this.textContent = formatNumber(i(t));
      };
    }

    function axis(svg) {
      const g = svg.append("g")
        .attr("transform", `translate(${labelWidth},${margin.top})`);

      const axis = d3.axisTop(x)
        //.ticks(width / 100)
        .tickFormat(d => numeral(d).format("($0.0a)"))
        .tickSizeOuter(0)
        .tickSizeInner(-barSize * (n + y.padding()));

      return (_, transition) => {
        g.transition(transition).call(axis);
        g.select(".tick:first-of-type text").remove();
        g.selectAll(".tick:not(:first-of-type) line")
          .attr("stroke", "white")
          .attr("stroke-width", 0.5);
        g.select(".domain").remove();
      };
    }

    function ticker(svg) {
      const formatDate = d3.utcFormat("%Y")
      const now = svg.append("text")
        .style("font", `bold ${barSize}px var(--sans-serif)`)
        .style("font-variant-numeric", "tabular-nums")
        .attr("text-anchor", "end")
        .attr("x", width - 6)
        .attr("y", margin.top + barSize * (n - 0.45))
        .attr("dy", "0.32em")
        .text(formatDate(keyframes[0][0]));

      return ([date], transition) => {
        transition.end().then(() => now.text(formatDate(date)));
      };
    }

    svg.attr("viewBox", [0, 0, width, height]);

    const updateBars = bars(svg);
    const updateAxis = axis(svg);
    const updateLabels = labels(svg);
    const updateTicker = ticker(svg);

    //yield svg.node();

    for (const keyframe of keyframes) {
      const transition = svg.transition()
        .duration(duration)
        .ease(d3.easeLinear);

      // Extract the top bar’s value.
      x.domain([0, keyframe[1][0].value]);

      updateAxis(keyframe, transition);
      updateBars(keyframe, transition);
      updateLabels(keyframe, transition);
      updateTicker(keyframe, transition);

      //invalidation.then(() => svg.interrupt());
      await transition.end();
    }
  }
};

export default raceChart;
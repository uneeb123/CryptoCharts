<template>
  <div id="chart">Sup</div>
</template>

<script>
import * as d3 from "d3";
import raceChart from "./raceChart.js";
export default {
  async created() {
    const data = await d3.csv("/data/category-brands.csv");
    const chartSvg = d3.select("#chart").append("svg");
    raceChart.init(data, chartSvg);
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>

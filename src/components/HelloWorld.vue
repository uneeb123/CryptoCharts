<template>
  <div id="chart"></div>
</template>

<script>
import * as d3 from "d3";
import raceChart from "./raceChart.js";
export default {
  async created() {
    const data2 = await d3.csv("/data/category-brands.csv");
    const cryptoFileToNames = {
      ada: "Cardano",
      atom: "Cosmos",
      bch: "Bitcoin Cash",
      bnb: "Binance Coin",
      bsv: "Bitcoin SV",
      btc: "Bitcoin",
      dash: "Dash",
      etc: "Ethereum Classic",
      eth: "Ethereum",
      leo: "UNUS SED LEO",
      link: "Chainlink",
      ltc: "Litecoin",
      neo: "Neo",
      tether: "Tether",
      trx: "Tron",
      xlm: "Stellar",
      xmr: "Monero",
      xrp: "XRP",
      xtz: "Tezos"
    };
    const marketCap = {};
    const cryptoFiles = Object.keys(cryptoFileToNames);
    const cryptoNames = Object.values(cryptoFileToNames);
    await Promise.all(
      cryptoFiles.map(async cryptoFile => {
        const data = await d3.csv(`/data/${cryptoFile}.csv`);
        marketCap[`${cryptoFileToNames[cryptoFile]}`] = data
          .map(d => {
            const date = new Date(d["Date"]);
            const marketCap = parseInt(d["Market Cap"].split(",").join(""));
            if (!isNaN(date) && !isNaN(marketCap) && marketCap !== 0) {
              return {
                date: date,
                marketCap: marketCap
              };
            } else {
              return null;
            }
          })
          .filter(d => d !== null)
          .reverse();
      })
    );
    const chartSvg = d3.select("#chart").append("svg");
    raceChart.init(data2, chartSvg, cryptoNames, marketCap);
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>

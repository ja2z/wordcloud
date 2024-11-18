import { useMemo, useRef } from "react";
import Highcharts from "highcharts";
import wordCloud from "highcharts/modules/wordcloud.js";
import HighchartsReact from "highcharts-react-official";
import { client, useConfig, useElementData } from "@sigmacomputing/plugin";
//npm install highcharts highcharts-react-official

client.config.configureEditorPanel([
  { name: "source", type: "element" },
  { name: "dimension", type: "column", source: "source", allowMultiple: false },
  { name: "measures", type: "column", source: "source", allowMultiple: false },
  { name: "Tokenize y/n?", type: "text", defaultValue: "N" },
]);

wordCloud(Highcharts);

Highcharts.seriesTypes.wordcloud.prototype.deriveFontSize = function (
  relativeWeight
) {
  var maxFontSize = 25;
  // Will return a fontSize between 0px and 25px.
  return Math.floor(maxFontSize * relativeWeight);
};

function App() {
  const config = useConfig();
  const sigmaData = useElementData(config.source);
  const ref = useRef();
  const options = useMemo(() => {
    const dimensions = config.dimension;
    const measures = config.measures;
    //transform sigmaData --> wordcloud data
    if (sigmaData?.[dimensions]) {
      let dataMap = [];
      let sw = require("stopword");
      for (let i = 0; i < sigmaData[dimensions].length; i++) {
        const text = sigmaData[dimensions][i];
        let weight = 1;
        // if a measure is specified, use it for the weighting
        if (sigmaData?.[measures]) {
          weight = sigmaData[measures][i];
        }
        // add text & weighting to dataMap, tokenize optional
        if (client.config.getKey("Tokenize y/n?") === "Y") {
          const words = sw.removeStopwords(text.split(/[,. ]+/g));
          for (let j = 0; j < words.length; j++) {
            dataMap[words[j]] === undefined
              ? (dataMap[words[j]] = weight)
              : (dataMap[words[j]] += weight);
          }
        } else {
          dataMap[text] === undefined
            ? (dataMap[text] = weight)
            : (dataMap[text] += weight);
        }
      }

      function getTopNItems(dataMap, n = 10) { // Default TopN
        if (!dataMap || typeof dataMap !== "object") {
          throw new Error("Invalid dataMap provided");
        }
        if (n <= 0) {
          throw new Error("N must be greater than 0");
        }

        return Object.entries(dataMap)
          .map(([name, weight]) => ({ name, weight }))
          .sort((a, b) => b.weight - a.weight)
          .slice(0, n);
      }

      // convert dataMap to array and get topN so we don't overwhelm the word cloud
      let data = [];

      try {
        data = getTopNItems(dataMap, 200); // TopN of 200 seems reasonable
      } catch (error) {
        console.error("Error:", error.message);
      }

      const options = {
        plotOptions: {
          series: {
            animation: false,
          },
        },
        series: [
          {
            type: "wordcloud",
            data: data,
          },
        ],
        title: {
          text: undefined,
        },
        chart: {
          height: (9 / 16) * 100 + "%",
          //backgroundColor: "transparent",
        },
      };

      return options;
    }
  }, [config, sigmaData]);

  return (
    <div>
      <HighchartsReact highcharts={Highcharts} options={options} ref={ref} />
    </div>
  );
}

export default App;

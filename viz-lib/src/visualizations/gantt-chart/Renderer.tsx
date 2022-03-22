import React, { useMemo, useState, useEffect } from "react";
import { RendererPropTypes } from "@/visualizations/prop-types";

import { groupBy } from "lodash";

import HighchartsReact from "highcharts-react-official";
// Import Highcharts
import Highcharts from "highcharts";
import highchartsGantt from "highcharts/modules/gantt";

highchartsGantt(Highcharts);

import "./renderer.less";

function prepareData(data: any) {
  const colors: any = {
    "Early Engagement": "#e1ebf3",
    "Proponent Time: Project Description": "#ccffff",
    "Readiness Decision": "#c3d7e8",
    "Process Planning": "#a6c3dd",
    "Proponent Time: Application Development": "#ccffff",
    "Application Development & Review": "#faeadc",
    "Proponent Time: Revised Application": "#ccffff",
    "Effects Assessment": "#f6d5b9",
    Recommendation: "#f2c096",
    "Referral/Decision": "#f2c096",
  };
  const projects = groupBy(data, (item: any) => item.project);
  const series: Array<any> = [];
  let projectIndex = 0;

  for (const project in projects) {
    const projectData: any = projects[project];
    const projectId: string = `${projectData[0].project_id}`;
    const projectSeries: any = {
      name: projectData[0].project,
      data: [],
    };

    projectData.forEach((phase: any) => {
      projectSeries.data.push({
        id: phase.phase_id,
        name: phase.phase,
        start: new Date(phase.phase_start).getTime(),
        end: new Date(phase.phase_end).getTime(),
        y: projectIndex,
        color: colors[phase.phase],
      });
    });
    series.push(projectSeries);
    projectIndex += 1;
  }

  return [series, Object.keys(projects)];
}

export default function Renderer({ data, options }: any) {
  const [tasks, projects] = prepareData(data.rows);
  const first = tasks[0];
  const last = tasks[tasks.length - 1];
  const day = 1000 * 60 * 60 * 24;
  const chartData: Highcharts.Options = {
    title: {
      text: "Projects",
    },
    xAxis: [
      {
        tickInterval: 1000 * 60 * 60 * 24 * 30, // Month
        labels: {
          format: "{value:%b}",
          style: {
            fontSize: "8px",
          },
          autoRotation: [-90],
        },
        min: first.data[0].start - day * 15,
        max: last.data[last.data.length - 1].end + day * 15,
        currentDateIndicator: false,
      },
      {
        tickInterval: 1000 * 60 * 60 * 24 * 365, // Year
        labels: {
          format: "{value:%Y}",
        },
        linkedTo: 0,
      },
    ],
    yAxis: {
      categories: projects,
    },
    series: tasks,
  };

  console.log(chartData);

  return (
    <div className="gantt-chart-visualization-container">
      <HighchartsReact
        highcharts={Highcharts}
        constructorType={"ganttChart"}
        options={chartData}
        containerProps={{ className: "gantt-chart-visualization" }}
      />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;

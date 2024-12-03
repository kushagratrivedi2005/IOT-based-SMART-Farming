const API_KEY = "U4JQDNFFT5XJBLL3";
const CHANNEL = 2677105;
document.addEventListener('DOMContentLoaded', function() {

    function getGraphData(field) {

        fetch('/api/generate_graph', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ field: field }),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                createGraph(data, field);
            })
            .catch(error => {
                console.error('Error fetching the data:', error);
            });
    }

    function createGraph(data, number) {
        const last15Data = data.slice(-15);

        const labels = last15Data.map(row => row.created_at);
        const fieldData = last15Data.map(row => row.field);

        const trace = {
            x: labels,
            y: fieldData,
            mode: 'lines+markers',
            type: 'scatter',
            name: 'Field ' + number + ' Data',
            marker: { size: 8, color: 'rgba(75, 192, 192, 1)' }
        };

        const layout = {
            title: 'Soil Moisture (Capacitive) Value Over Time (in %)',
            xaxis: {
                title: 'Timestamp',
                tickangle: -45
            },
            yaxis: {
                title: 'Soil Moisture (Capacitive) Value (in %)',
                rangemode: 'tozero'
            }
        };

        const dataToPlot = [trace];
        const divName = 'field';
        Plotly.newPlot(divName, dataToPlot, layout);
    }

    function findNonNullFieldValue(data, field) {
        for (const feed of data.feeds) {
            if (feed[field] !== null && feed[field] !== undefined) {
                return feed[field];
            }
        }
        return 0;
    }

    function getSolenoidStatus(soilMoistureResistive, soilMoistureCapacitive) {
        if(soilMoistureCapacitive < 0) {
            if(soilMoistureResistive <= 5) {
                return 0;
            }
            if(soilMoistureResistive < 15) {
                return 1;
            }
            return 0;
        }
        if(soilMoistureCapacitive <= 12) {
            return 1;
        }
        return 0;
    }  

    function click_on() {
        const url = `https://api.thingspeak.com/channels/${CHANNEL}/feeds.json?api_key=${API_KEY}&results=1`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                const fieldValues = [
                    findNonNullFieldValue(data, 'field1'),
                    findNonNullFieldValue(data, 'field2'),
                    findNonNullFieldValue(data, 'field3'),
                    findNonNullFieldValue(data, 'field4'),
                    findNonNullFieldValue(data, 'field5'),
                    findNonNullFieldValue(data, 'field6'),
                    findNonNullFieldValue(data, 'field7'),
                    getSolenoidStatus(findNonNullFieldValue(data, 'field6'), findNonNullFieldValue(data, 'field7'))
                    // findNonNullFieldValue(data, 'field8')
                ];

                // Update HTML elements
                // document.getElementById("field1").innerHTML = `${fieldValues[0]}%`;
                // document.getElementById("field2").innerHTML = `${fieldValues[1]}°C`;
                // document.getElementById("field3").innerHTML = `${fieldValues[2]} ppm`;
                // document.getElementById("field4").innerHTML = `${fieldValues[3]} ppb`;
                // computeField5Value(fieldValues[4]);
                // document.getElementById("field6").innerHTML = `${fieldValues[5]}%`;
                // document.getElementById("field7").innerHTML = `${fieldValues[6]}%`;

                // checkBounds(fieldValues);

                const created_at = data.feeds[0].created_at;

                sendDataToServer({
                    field1: fieldValues[0],
                    field2: fieldValues[1],
                    field3: fieldValues[2],
                    field4: fieldValues[3],
                    field5: fieldValues[4],
                    field6: fieldValues[5],
                    field7: fieldValues[6],
                    field8: fieldValues[7] || '',
                    created_at: created_at,
                    latitude: data.feeds[0].latitude || '',
                    longitude: data.feeds[0].longitude || '',
                    elevation: data.feeds[0].elevation || '',
                    status: data.feeds[0].status || ''
                });
            })
            .catch(error => console.error('Error fetching data:', error));
    }

    function sendDataToServer(data) {
        fetch('/save-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    function main() {
        click_on();
        getGraphData(7);
    }

    setInterval(main, 5000);

    main();
    
});
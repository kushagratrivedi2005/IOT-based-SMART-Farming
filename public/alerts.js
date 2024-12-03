const API_KEY = "U4JQDNFFT5XJBLL3";
const CHANNEL = 2677105;

document.addEventListener('DOMContentLoaded', function() {
    const sensors = [
        { name: "Humidity", threshold: [40, 80], current: 55, append: "%", field: 'field1' },
        { name: "Temperature", threshold: [20, 45], current: 40, append: "°C", field: 'field2' },
        { name: "CO2 levels", threshold: [0, 500], current: 500, append: "ppm", field: 'field3' },
        { name: "TVOC", threshold: [0, 400], current: 500, append: "ppb", field: 'field4' },
        { name: "Light Intensity", threshold: [0, 4095], current: 200, append: "", field: 'field5' },
        { name: "Soil Moisture (Resistive)", threshold: [30, 80], current: 50, append: "%", field: 'field6' },
        { name: "Soil Moisture (Capacitive)", threshold: [20, 70], current: 50, append: "%", field: 'field7' },
    ];

    const tableBody = document.querySelector("#sensor-table tbody");

    function updateSensorTable() {
        tableBody.innerHTML = ''; // Clear existing rows
        sensors.forEach(sensor => {
            const row = document.createElement("tr");

            // Determine if the current value is within the threshold range
            const isWithinThreshold = sensor.current >= sensor.threshold[0] && sensor.current <= sensor.threshold[1];
            row.className = isWithinThreshold ? "within-threshold" : "out-of-threshold";

            // Add table cells
            row.innerHTML = `
                <td>${sensor.name}</td>
                <td>${sensor.threshold[0]} - ${sensor.threshold[1]}${sensor.append}</td>
                <td>${sensor.current}${sensor.append}</td>
            `;

            tableBody.appendChild(row);
        });
    }

    function findNonNullFieldValue(data, field) {
        for (const feed of data.feeds) {
            if (feed[field] !== null && feed[field] !== undefined) {
                return parseFloat(feed[field]);
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
                ];

                // Update sensor values dynamically
                sensors.forEach((sensor, index) => {
                    if (fieldValues[index] !== undefined) {
                        sensor.current = fieldValues[index];
                    }
                });

                // Update the table with new sensor values
                updateSensorTable();

                const created_at = data.feeds[0].created_at;

                sendDataToServer({
                    field1: fieldValues[0],
                    field2: fieldValues[1],
                    field3: fieldValues[2],
                    field4: fieldValues[3],
                    field5: fieldValues[4],
                    field6: fieldValues[5],
                    field7: fieldValues[6],
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
    }

    // Initial table rendering
    updateSensorTable();

    // Set interval to update data
    setInterval(main, 5000);

    // Initial data fetch
    main();
});
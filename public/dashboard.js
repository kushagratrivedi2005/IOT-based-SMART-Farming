const API_KEY = "U4JQDNFFT5XJBLL3";
const CHANNEL = 2677105;

document.addEventListener('DOMContentLoaded', function() {

    const graph1Link = document.getElementById('graph1Link');
    const graph2Link = document.getElementById('graph2Link');
    const graph3Link = document.getElementById('graph3Link');
    const graph4Link = document.getElementById('graph4Link');
    const graph5Link = document.getElementById('graph5Link');
    const graph6Link = document.getElementById('graph6Link');
    const graph7Link = document.getElementById('graph7Link');
    graph1Link.addEventListener('click', function(event) {
        event.preventDefault();
        window.location.href = 'graph1.html';
    });
    graph2Link.addEventListener('click', function(event) {
        event.preventDefault();
        window.location.href = 'graph2.html';
    });
    graph3Link.addEventListener('click', function(event) {
        event.preventDefault();
        window.location.href = 'graph3.html';
    });
    graph4Link.addEventListener('click', function(event) {
        event.preventDefault();
        window.location.href = 'graph4.html';
    });
    graph5Link.addEventListener('click', function(event) {
        event.preventDefault();
        window.location.href = 'graph5.html';
    });
    graph6Link.addEventListener('click', function(event) {
        event.preventDefault();
        window.location.href = 'graph6.html';
    });
    graph7Link.addEventListener('click', function(event) {
        event.preventDefault();
        window.location.href = 'graph7.html';
    });

    document.getElementById('clearAlertField1').addEventListener('click', function() {
        clearAlert('humidity');
    });

    document.getElementById('clearAlertField2').addEventListener('click', function() {
        clearAlert('temperature');
    });

    document.getElementById('clearAlertField3').addEventListener('click', function() {
        clearAlert('co2-levels');
    });

    document.getElementById('clearAlertField4').addEventListener('click', function() {
        clearAlert('tvoc');
    });

    document.getElementById('clearAlertField5').addEventListener('click', function() {
        clearAlert('ldr');
    });

    document.getElementById('clearAlertField6').addEventListener('click', function() {
        clearAlert('soil-moisture-resistive');
    });

    document.getElementById('clearAlertField7').addEventListener('click', function() {
        clearAlert('soil-moisture-capacitive');
    });

    function clearAlert(fieldName) {
    const fieldElement = document.getElementById(fieldName);
    fieldElement.style.backgroundColor = 'white';
    
    // Retrieve the current alerts from localStorage 
    const storedAlerts = JSON.parse(localStorage.getItem('alerts')) || [];
    
    // Filter out the alert message related to the cleared field
    const updatedAlerts = storedAlerts.filter(alert => !alert.includes(fieldName));

    // Update localStorage with the new alerts
    localStorage.setItem('alerts', JSON.stringify(updatedAlerts));
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
            if(soilMoistureResistive <= 35) {
                return 1;
            }
            return 0;
        }
        if(soilMoistureCapacitive <= 40) {
            return 1;
        }
        return 0;
    }  

    function computeField5Value(value) {
        if (value < 40) {
            document.getElementById("field5").innerHTML = `${value} (Dark)`;
        } else if (value < 800) {
            document.getElementById("field5").innerHTML = `${value} (Dim)`;
        } else if (value < 2000) {
            document.getElementById("field5").innerHTML = `${value} (Light)`;
        } else if (value < 3200) {
            document.getElementById("field5").innerHTML = `${value} (Bright)`;
        } else {
            document.getElementById("field5").innerHTML = `${value} (Very Bright)`;
        }
    }

    // Define lower and upper bounds for each field
    const bounds = {
        field1: { lower: 40, upper: 80 },      // Example bounds for field1
        field2: { lower: 20, upper: 45 },       // Example bounds for field2
        field3: { lower: 0, upper: 500 },      // Example bounds for field3
        field4: { lower: 0, upper: 400 },     // Example bounds for field4
        field5: { lower: 0, upper: 4095 },       // Example bounds for field5
        field6: { lower: 30, upper: 80 },      // Example bounds for field6
        field7: { lower: 20, upper: 60 },      // Example bounds for field7
    };

    const fieldNames = [
        "humidity",
        "temperature",
        "co2-levels",
        "tvoc",
        "ldr",
        "soil-moisture-resistive",
        "soil-moisture-capacitive"
    ];

    // Function to display alert messages if values are out of bounds
    function checkBounds(fieldValues) {
        const alertMessages = [];
        const existingAlerts = JSON.parse(localStorage.getItem('alerts')) || []; // Retrieve existing alerts

        for (let i = 0; i < fieldValues.length - 1; i++) {
            const fieldId = `field${i + 1}`;
            const fieldName = fieldNames[i];
            const value = fieldValues[i];
            const lowerBound = bounds[fieldId].lower;
            const upperBound = bounds[fieldId].upper;

            const fieldElement = document.getElementById(fieldName);

            // Check if the value is out of bounds
            if (value < lowerBound || value > upperBound) {
                fieldElement.style.backgroundColor = 'red';
                alertMessages.push(`${fieldName} is out of bounds: ${value}`);
            } else {
                // Clear the alert if the value is back within bounds
                if (existingAlerts.includes(`${fieldName} is out of bounds: ${value}`)) {
                    const index = existingAlerts.indexOf(`${fieldName} is out of bounds: ${value}`);
                    existingAlerts.splice(index, 1); // Remove the alert from existing alerts
                }
                fieldElement.style.backgroundColor = 'white';
            }
        }

        // Store remaining alerts in localStorage
        if (alertMessages.length > 0) {
            localStorage.setItem('alerts', JSON.stringify(alertMessages));
        } else {
            // Clear localStorage if no alerts are left
            localStorage.removeItem('alerts');
        }
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
                document.getElementById("field1").innerHTML = `${fieldValues[0]}%`;
                document.getElementById("field2").innerHTML = `${fieldValues[1]}°C`;
                document.getElementById("field3").innerHTML = `${fieldValues[2]} ppm`;
                document.getElementById("field4").innerHTML = `${fieldValues[3]} ppb`;
                computeField5Value(fieldValues[4]);
                document.getElementById("field6").innerHTML = `${fieldValues[5]}%`;
                document.getElementById("field7").innerHTML = `${fieldValues[6]}%`;
                document.getElementById("field8").innerHTML = `${fieldValues[7] === 1 ? 'ON' : 'OFF'}`;

                checkBounds(fieldValues);

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
    }

    setInterval(main, 5000);

    main();
});
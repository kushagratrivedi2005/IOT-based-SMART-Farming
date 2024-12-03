const API_KEY = "U4JQDNFFT5XJBLL3";
const CHANNEL = 2677105;
document.addEventListener('DOMContentLoaded', function() {
    // about.js
    let index = 0;

    const personName = document.getElementById('person-name');
    const personJob = document.getElementById('person-job');
    const personInfo = document.getElementById('person-info');
    const personImage = document.getElementById('person-image');

    // Function to display the current team member's details
    function showPerson() {
        const member = team_members[index];
        personName.textContent = member.name;
        personJob.textContent = member.job;
        personInfo.textContent = member.text;
        personImage.src = member.image; // Load image from the array
    }

    // Navigation functions to move to the next/previous person
    function nextPerson() {
        index = (index + 1) % team_members.length; // Cycle forward
        showPerson();
    }

    function prevPerson() {
        index = (index - 1 + team_members.length) % team_members.length; // Cycle backward
        showPerson();
    }

    // Event listeners for buttons
    document.getElementById('next-btn').addEventListener('click', nextPerson);
    document.getElementById('prev-btn').addEventListener('click', prevPerson);

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
        showPerson();
    }

    setInterval(main, 5000);

    main();
});
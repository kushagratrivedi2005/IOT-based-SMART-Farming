const API_KEY = "U4JQDNFFT5XJBLL3";
const CHANNEL = 2677105;
const RESULTS = 10;

document.addEventListener('DOMContentLoaded', function() {
    var condition = 0;
    var previousDataStored = false;

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

    function storePreviousData(data) {
        return new Promise(function(resolve, reject) {
            const reversedFeeds = data.feeds;
            let promises = [];

            for (let i = 0; i < reversedFeeds.length; i++) {
                const feed = reversedFeeds[i];
                promises.push(new Promise(function(innerResolve, innerReject) {
                    sendDataToServer({
                        field1: feed.field1,
                        field2: feed.field2,
                        field3: feed.field3,
                        field4: feed.field4,
                        field5: feed.field5,
                        field6: feed.field6,
                        field7: feed.field7,
                        field8: '',
                        created_at: feed.created_at,
                        latitude: feed.latitude || '',
                        longitude: feed.longitude || '',
                        elevation: feed.elevation || '',
                        status: feed.status || ''
                    }, function(success) {
                        innerResolve(success);
                    }, function(error) {
                        innerReject(error);
                    });
                }));
            }

            Promise.all(promises)
                .then(function() {
                    resolve(true);
                })
                .catch(function(error) {
                    reject(error);
                });
        });
    }

    function get_previous_data_thingspeak() {
        const url = `https://api.thingspeak.com/channels/${CHANNEL}/feeds.json?results=${RESULTS}&api_key=${API_KEY}`;
        
        fetch(url)
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                return storePreviousData(data);
            })
            .then(function() {
                previousDataStored = true;
                click_on();
            })
            .catch(function(error) {
                console.error('Error fetching or storing previous data:', error);
            });
    }

    function click_on() {
        if (!previousDataStored) return;

        const url = `https://api.thingspeak.com/channels/${CHANNEL}/feeds.json?api_key=${API_KEY}&results=1`;

        fetch(url)
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
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

                const created_at = data.feeds[0].created_at;
                sendDataToServer({
                    field1: fieldValues[0],
                    field2: fieldValues[1],
                    field3: fieldValues[2],
                    field4: fieldValues[3],
                    field5: fieldValues[4],
                    field6: fieldValues[5],
                    field7: fieldValues[6],
                    field8: '',
                    created_at: created_at,
                    latitude: data.feeds[0].latitude || '',
                    longitude: data.feeds[0].longitude || '',
                    elevation: data.feeds[0].elevation || '',
                    status: data.feeds[0].status || ''
                });
            })
            .catch(function(error) {
                console.error('Error fetching latest data:', error);
            });
    }

    function sendDataToServer(data, successCallback, errorCallback) {
        fetch('/save-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(responseData) {
            console.log('Success:', responseData);
            if (successCallback) successCallback(responseData);
        })
        .catch(function(error) {
            console.error('Error:', error);
            if (errorCallback) errorCallback(error);
        });
    }

    function main() {
        if(condition == 0) {
            get_previous_data_thingspeak();
        } else {
            click_on();
        }
        condition = 1;
    }

    setInterval(main, 5000);
});
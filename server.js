const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const csv = require('csv-parser');
const e = require('express');
const { exec } = require('child_process');  // Import exec to run Python scripts

const app = express();
app.use(bodyParser.json());

const csvWriter = createCsvWriter({
    path: 'feed.csv',
    header: [
        {id: 'created_at', title: 'created_at'},
        {id: 'entry_id', title: 'entry_id'},
        {id: 'field1', title: 'field1'},
        {id: 'field2', title: 'field2'},
        {id: 'field3', title: 'field3'},
        {id: 'field4', title: 'field4'},
        {id: 'field5', title: 'field5'},
        {id: 'field6', title: 'field6'},
        {id: 'field7', title: 'field7'},
        {id: 'field8', title: 'field8'},
        {id: 'latitude', title: 'latitude'},
        {id: 'longitude', title: 'longitude'},
        {id: 'elevation', title: 'elevation'},
        {id: 'status', title: 'status'}
    ],
    append: true  // Ensures data is appended to the CSV file
});

function reindexCSV() {
    const results = [];
    
    // Read the CSV file
    fs.createReadStream('feed.csv')
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            // Sort by created_at timestamp
            results.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            
            // Reindex with new entry_id
            const reindexedResults = results.map((row, index) => ({
                ...row,
                entry_id: index + 1  // Start from 1
            }));
            
            // Write back to CSV
            const csvWriter = createCsvWriter({
                path: 'feed.csv',
                header: [
                    {id: 'created_at', title: 'created_at'},
                    {id: 'entry_id', title: 'entry_id'},
                    {id: 'field1', title: 'field1'},
                    {id: 'field2', title: 'field2'},
                    {id: 'field3', title: 'field3'},
                    {id: 'field4', title: 'field4'},
                    {id: 'field5', title: 'field5'},
                    {id: 'field6', title: 'field6'},
                    {id: 'field7', title: 'field7'},
                    {id: 'field8', title: 'field8'},
                    {id: 'latitude', title: 'latitude'},
                    {id: 'longitude', title: 'longitude'},
                    {id: 'elevation', title: 'elevation'},
                    {id: 'status', title: 'status'}
                ]
            });
            
            csvWriter.writeRecords(reindexedResults)
                .then(() => console.log('CSV reindexed successfully'));
        });
}

let oldDateTimeStr = '';

function countRowsSync(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        const rows = data.split('\n');
        console.log('row length: ', rows.length);
        
        if (rows.length > 1) { // Check if there's any data besides the header
            const lastRow = rows[rows.length - 2].split(','); // Second-to-last row (last is empty due to newline)
            console.log('last row: ', lastRow);
            oldDateTimeStr = lastRow[0];
            console.log('oldDateTimeStr: ', oldDateTimeStr);
        } else {
            oldDateTimeStr = ''; // Reset if no data
        }

        return rows.length - 1; // Exclude header row
    } catch (error) {
        console.error('Error reading file:', error);
        oldDateTimeStr = ''; // Reset on error
        return 0;
    }
}


const filePath = 'feed.csv'; // Your CSV file path
const rowCount = countRowsSync(filePath);

let entry_id_counter = rowCount - 1;  // Initialize the `entry_id` counter

function addTimeToDate(datetimeStr, timeToAdd) {
    // Parse the given datetime string into a Date object
    const date = new Date(datetimeStr);

    // Extract hours and minutes to be added from timeToAdd
    const [hoursToAdd, minutesToAdd] = timeToAdd.split(':').map(Number);

    // Add hours and minutes
    date.setHours(date.getHours() + hoursToAdd);
    date.setMinutes(date.getMinutes() + minutesToAdd);

    // Format the date back to the original format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const timezoneOffset = '+05:30'; // Keep the original timezone

    // Return the new datetime string in the desired format
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezoneOffset}`;
}

function checkDateAndTime(oldDateTimeStr, currentDateTimeStr, newDateTimeStr) {
    const oldDateTime = new Date(oldDateTimeStr);
    const newDateTime = new Date(newDateTimeStr);
    const currentDateTime = new Date(currentDateTimeStr);

    // console.log(oldDateTime);
    // console.log(currentDateTime);
    // console.log(newDateTime);

    if (oldDateTime < currentDateTime && currentDateTime < newDateTime) {
        return true;
    }
    return false;
}

app.post('/save-data', (req, res) => {
    // console.log('Received request to save data:', req.body);
    const timeToAdd = '00:00'
    countRowsSync(filePath);
    const currentTime = new Date();
    const newDatetime = String(currentTime).slice(0, -5) + '+05:30';
    const newDatetimeStr = addTimeToDate(newDatetime, timeToAdd);

    const data = req.body;

    data.created_at = data.created_at.slice(0, -1) + '+05:30';
    data.created_at = addTimeToDate(data.created_at, '05:30');

    console.log('Data received: ', data.created_at);
    console.log('oldDateTimeStr: ', oldDateTimeStr);
    console.log('newDatetimeStr: ', newDatetimeStr);
    
    if(checkDateAndTime(oldDateTimeStr, data.created_at, newDatetimeStr) == false) {
        return res.status(200).json({message: 'Already at the latest time'});
    }
    oldDateTimeStr = data.created_at;
    const newRecord = {
        created_at: data.created_at,
        entry_id: ++entry_id_counter, 
        field1: String(data.field1) + '.0',
        field2: String(data.field2) + '.0',
        field3: String(data.field3) + '.0',
        field4: String(data.field4) + '.0',
        field5: String(data.field5) + '.0',
        field6: String(data.field6) + '.0',
        field7: String(data.field7) + '.0',
        field8: data.field8 || '',   // Assuming field8 might not always be provided
        latitude: data.latitude || '',  // Default to empty if not provided
        longitude: data.longitude || '',  // Default to empty if not provided
        elevation: data.elevation || '',  // Default to empty if not provided
        status: data.status || ''  // Default to empty if not provided
    };

    csvWriter.writeRecords([newRecord])
        .then(() => {
            reindexCSV();
            res.status(200).json({message: 'Data saved successfully!'});
        })
        .catch(err => {
            console.error('Error writing to CSV file:', err);
            res.status(500).json({message: 'Error saving data.'});
        });
});

const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate_graph', (req, res) => {
    const results = [];
    const csvFilePath = path.join(__dirname, 'feed.csv'); // Adjust path as needed

    const data = req.body;

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data_csv) => {
            // Change indices as per your CSV structure
            if(data.field == 1) {
                if (data_csv.field1 && data_csv.created_at) {
                    results.push({ created_at: data_csv.created_at, field: parseFloat(data_csv.field1) });
                }
            }
            else if(data.field == 2) {
                if (data_csv.field2 && data_csv.created_at) {
                    results.push({ created_at: data_csv.created_at, field: parseFloat(data_csv.field2) });
                }
            }
            else if(data.field == 3) {
                if (data_csv.field3 && data_csv.created_at) {
                    results.push({ created_at: data_csv.created_at, field: parseFloat(data_csv.field3) });
                }
            }
            else if(data.field == 4) {
                if (data_csv.field4 && data_csv.created_at) {
                    results.push({ created_at: data_csv.created_at, field: parseFloat(data_csv.field4) });
                }
            }
            else if(data.field == 5) {
                if (data_csv.field5 && data_csv.created_at) {
                    results.push({ created_at: data_csv.created_at, field: parseFloat(data_csv.field5) });
                }
            }
            else if(data.field == 6) {
                if (data_csv.field6 && data_csv.created_at) {
                    results.push({ created_at: data_csv.created_at, field: parseFloat(data_csv.field6) });
                }
            }
            else if(data.field == 7) {
                if (data_csv.field7 && data_csv.created_at) {
                    results.push({ created_at: data_csv.created_at, field: parseFloat(data_csv.field7) });
                }
            }
        })
        .on('end', () => {
            res.status(200).json(results); // Send JSON response
        })
        .on('error', (error) => {
            console.error('Error reading CSV file:', error);
            res.status(500).json({message: 'Error reading CSV file'});
        });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.get('/api/interval_predictions', (req, res) => {
    // First, execute the Python script to update interval_predictions.json
    exec('python3 ml_model.py', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing Python script: ${stderr}`);
            return res.status(500).json({ message: 'Error running ML script' });
        }

        // After the script runs, read the updated JSON file
        const jsonFilePath = path.join(__dirname, 'interval_predictions.json'); // Adjust path as needed

        fs.readFile(jsonFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading JSON file:', err);
                return res.status(500).json({ message: 'Error reading JSON file' });
            }

            try {
                const jsonData = JSON.parse(data);
                res.status(200).json(jsonData); // Send the parsed JSON data
            } catch (parseError) {
                console.error('Error parsing JSON data:', parseError);
                res.status(500).json({ message: 'Error parsing JSON data' });
            }
        });
    });
});
// Get the lists
const emergencyList = document.getElementById('emergencyList');
const sameDayList = document.getElementById('sameDayList');

// // Function to add items to the list
function addItemToList(listId, link, text, associatedObject={}) {
    const list = document.getElementById(listId);
    const listItem = document.createElement('li');
    const anchor = document.createElement('a');
    
    // Set href, text content, and target for the anchor
    anchor.href = link;
    anchor.textContent = text;
    anchor.target = "_blank";
    
    // Set the associated object as a data attribute
    anchor.dataset.associatedObject = JSON.stringify(associatedObject);

    listItem.appendChild(anchor);
    list.appendChild(listItem);
}

// Example usage:
// const myObject1 = { id: 1, name: 'Object 1' };
// const myObject2 = { id: 2, name: 'Object 2' };

// addItemToList('emergencyList', 'https://example.com', 'Item 1', myObject1);
// addItemToList('sameDayList', 'https://example.com', 'Item 2', myObject2);


function createMapUrlAndAddItemToList(listId, responseData, cloudHost) {
    if (responseData && responseData.data && responseData.data.length) {
        let paramsArray = responseData.data.forEach((dataObj) => {
            try {
                let {act, scall, add} = dataObj;
                // URL to make - https://us.coresystems.net/shell/#/planning-dispatching/map/date/latitude,longitude/activities/activityId
                let {latitude, longitude} = add.location ? add.location : {latitude: 0, longitude: 0}; // if there's no lat and long data, we're defauilting to 0 & 0 so as to avoid the failure case
                let {id: activityId, createDateTime, code} = act;
                let mapDate = createDateTime ? createDateTime.substring(0, 10) : new Date().toISOString().substring(0, 10);
                let mapUrlForCurrentActivity = `https://us.coresystems.net/shell/#/planning-dispatching/map/${mapDate}/${latitude},${longitude}/activities/${activityId}`;
                let itemText = `${code} - Map`;
                addItemToList(listId, mapUrlForCurrentActivity, itemText);
            } catch (error) {
                let err;
            }
        })
    }
}



document.getElementById('timeLink').addEventListener('click', onTimeClick);
let isTimerUpdated = false;
let previousInputValue;

function onTimeClick() {
    if (!isTimerUpdated) {
        isTimerUpdated = true;
        const controlsContainer = document.createElement('div');
        controlsContainer.classList.add('controls-container');
        controlsContainer.setAttribute('id','timerId');
    
        // Create a new input control
        const inputControl = document.createElement('input');
        inputControl.setAttribute('id','inputId');
        inputControl.placeholder = 'Enter time...';
        inputControl.type = 'text'; // Use 'text' to allow pattern validation
        inputControl.value = 10;
        previousInputValue = 10;
    
        // Validate and sanitize input on each change
        inputControl.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, ''); // Allow only numeric input
        });
    
        // Create a div for vertical alignment
        const inputButtonsContainer = document.createElement('div');
    
        // Create two buttons (check and cross)
        const checkButton = document.createElement('button');
        checkButton.innerHTML = 'Save';
        checkButton.classList.add('button-save'); // Add a class for styling
        checkButton.addEventListener('click', onTimerSave);
    
        const crossButton = document.createElement('button');
        crossButton.innerHTML = 'Cancel';
        crossButton.classList.add('button-cancel'); // Add a class for styling
        crossButton.addEventListener('click', onTimerCancel);
    
        // Append the input control to the container
        controlsContainer.appendChild(inputControl);
    
        // Append buttons to the buttons container
        inputButtonsContainer.appendChild(checkButton);
        inputButtonsContainer.appendChild(crossButton);
    
        // Append the buttons container to the main container
        controlsContainer.appendChild(inputButtonsContainer);
    
        // Append the container to the body
        document.body.appendChild(controlsContainer);
    
        // Disable other controls
        disableControls();
    } else {
        document.getElementById('timerId').style.display = 'block';
        disableControls();
    }
}

async function onTimerSave() {
    document.getElementById('timerId').style.display = 'none';
    enableControls();
    // Here we've to fetch the data with the previousInputValue as the timer
    await fetchData('emergencyList', globalCompanyObject);
    await fetchData('sameDayList', globalCompanyObject);
}

function onTimerCancel() {
    document.getElementById('inputId').value = previousInputValue;
    document.getElementById('timerId').style.display = 'none';
    enableControls();
    // Dont fetch any data
}


function disableControls() {
    // Disable other controls as needed
    document.getElementById('activitiesSection').style.display = 'none';
    document.getElementById('nav').style.display = 'none';
}

function enableControls() {
    // Enable other controls as needed
    document.getElementById('activitiesSection').style.display = 'block';
    document.getElementById('nav').style.display = 'block';
}
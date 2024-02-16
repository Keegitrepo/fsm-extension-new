var globalCompanyObject;
var shellReferenceObject = {};
function updateWarning(text) {
    document.getElementById("greet").innerHTML = text
}

function isInsideShell(FSMShell) {
    const { ShellSdk, SHELL_EVENTS } = FSMShell;
    if (!ShellSdk.isInsideShell()) {
        updateWarning('⚠️ Unable to reach shell event API');
    } else {
        // Initialise ShellSDK to connect with parent shell library
        const shellSdk = ShellSdk.init(parent, '*');

        // Initialise the extension by requesting the fsm context
        shellSdk.emit(SHELL_EVENTS.Version1.REQUIRE_CONTEXT, {
            clientIdentifier: '000179c6-c140-44ec-b48e-b447949fd5c9',
            clientSecret: '46342ddc-22aa-4f11-98a7-e9032b55477f',
            auth: {
                response_type: 'token'  // request a user token within the context
            }
        });

        // Callback on FSM context response
        shellSdk.on(SHELL_EVENTS.Version1.REQUIRE_CONTEXT, (event) => {
            const {
                // extract required context from event content
                auth
            } = JSON.parse(event);
            globalCompanyObject = JSON.parse(event);

            // Access_token has a short life stpan and needs to be refreshed before expiring
            // Each extension need to implement its own strategy to fresh it.
            shellReferenceObject["shellSdk"] = shellSdk;
            shellReferenceObject["SHELL_EVENTS"] = SHELL_EVENTS;
            shellReferenceObject["auth"] = auth;
            shellReferenceObject["jsonEvent"] = JSON.parse(event);
            initializeRefreshTokenStrategy(shellSdk, SHELL_EVENTS, auth, JSON.parse(event));
        });
    }
}

// Loop before a token expire to fetch a new one
async function initializeRefreshTokenStrategy(shellSdk, SHELL_EVENTS, auth, comapnyObject) {
    shellSdk.on(SHELL_EVENTS.Version1.REQUIRE_AUTHENTICATION, (event) => {
        sessionStorage.setItem('token', event.access_token);
        setTimeout(() => fetchToken(), (event.expires_in * 1000) - 10000);
    });

    function fetchToken() {
        shellSdk.emit(SHELL_EVENTS.Version1.REQUIRE_AUTHENTICATION, {
            response_type: 'token'  // request a user token within the context
        });
    }

    sessionStorage.setItem('token', auth.access_token);
    setTimeout(() => fetchToken(), (auth.expires_in * 1000) - 10000);

    await fetchData('emergencyList', comapnyObject, { "query": "select rr.id,rr.code, act.id,act.udf.ZZEMRALERT , act.startDateTime, act.code, act.timeZoneId, scall.code, scall.subject, scall.createDateTime, add.location, eq.id as equipment_id from ServiceCall scall INNER JOIN Activity act ON act.object.objectId = scall.id INNER JOIN Address add ON add.id = act.address INNER JOIN Region rr ON rr.id = act.region INNER JOIN Equipment eq ON eq.id = act.equipment WHERE scall.priority = 'HIGH' AND scall.typeCode = 'GEMR' AND act.status = 'DRAFT' AND act.executionStage = 'DISPATCHING'"}); // For Emergency orders
    await fetchData('sameDayList', comapnyObject, { "query": "select act.id, act.createDateTime, act.code, scall.code, scall.subject, add.location, add.location from ServiceCall scall INNER JOIN Activity act ON act.object.objectId = scall.id INNER JOIN Address add ON add.id = act.address WHERE scall.priority = 'HIGH' AND scall.typeCode != 'GEMR' AND act.status = 'DRAFT' AND act.executionStage = 'DISPATCHING'"}); // For Same day orders
}
let previousEmergencyCount = 0;
async function fetchData(listId, comapnyObject, queryObj) {
    // Next call for loading the data asynchronously time to time
    let inputValue = document.getElementById("inputId") ? document.getElementById("inputId").value : 10; // i.e default value
    let loadDataTimePeriod = Number(inputValue) * 60 * 1000; // time in milli seconds i.e 1min * 60sec * 1000ms
    let id = setTimeout((listId, comapnyObject) => {
        fetchData(listId, comapnyObject);
    }, loadDataTimePeriod, listId, comapnyObject);
    shellReferenceObject[`${listId}`] = id;

    const { cloudHost, account, company, accountId, companyId } = comapnyObject; // extract required context from event content

    const header = {
        "Content-Type": "application/json",
        "X-Client-ID": "000179c6-c140-44ec-b48e-b447949fd5c9",
        "X-Client-Version": "1.0",
        "Authorization": `bearer ${sessionStorage.getItem('token')}`,
        "X-Account-ID": accountId,
        "X-Company-ID": companyId
    };
    let url = `https://${cloudHost}/api/query/v1?account=${account}&company=${company}&dtos=Activity.43;ServiceCall.27;Address.22;Region.9;Equipment.24`
    let body = JSON.stringify(queryObj);
    let method = 'POST';

    try {
        let response = await fetch(url, {
            method: method,
            headers: header,
            body: body
        });
        if (!response.ok) {throw false};

        let jsonResponse = await response.json();
        document.getElementById(listId).innerHTML = '';
        createMapUrlAndAddItemToList(listId, jsonResponse, cloudHost);
        if (listId === 'emergencyList' && jsonResponse.data && jsonResponse.data.length > 0){
            jsonResponse.data.forEach(data => {
                let { act } = data;
                if (act && Array.isArray(act.udfValues)){
                let ZZEMRALERT = act.udfValues.find(udf => udf.name === "ZZEMRALERT");
                    if (ZZEMRALERT && ZZEMRALERT.value === "false") {
                        alert('ZZEMRALERT is false!');
                        ZZEMRALERT.value = true;
                   }
                }
            });
            setTimeout(() => {
                alert.dismiss();
            }, 2000);
        }
        return true
    } catch (error) {
        document.getElementById('emergencyList').innerHTML = '';
        document.getElementById('sameDayList').innerHTML = '';
        
        clearTimeout(shellReferenceObject['emergencyList']);
        clearTimeout(shellReferenceObject['sameDayList']);

        shellReferenceObject.shellSdk.emit(shellReferenceObject["SHELL_EVENTS"].Version1.REQUIRE_AUTHENTICATION, {
            response_type: 'token'  // request a user token within the context
        });

        shellReferenceObject.shellSdk.on(shellReferenceObject["SHELL_EVENTS"].Version1.REQUIRE_AUTHENTICATION, async (event) => {
            sessionStorage.setItem('token', event.access_token);
            await fetchData('emergencyList', comapnyObject, { "query": "select rr.id,rr.code, act.id,act.udf.ZZEMRALERT , act.startDateTime, act.code, act.timeZoneId, scall.code, scall.subject, scall.createDateTime, add.location, eq.id as equipment_id from ServiceCall scall INNER JOIN Activity act ON act.object.objectId = scall.id INNER JOIN Address add ON add.id = act.address INNER JOIN Region rr ON rr.id = act.region INNER JOIN Equipment eq ON eq.id = act.equipment WHERE scall.priority = 'HIGH' AND scall.typeCode = 'GEMR' AND act.status = 'DRAFT' AND act.executionStage = 'DISPATCHING'"}); // For Emergency orders
            await fetchData('sameDayList', comapnyObject, { "query": "select act.id, act.createDateTime, act.code, scall.code, scall.subject, add.location, add.location from ServiceCall scall INNER JOIN Activity act ON act.object.objectId = scall.id INNER JOIN Address add ON add.id = act.address WHERE scall.priority = 'HIGH' AND scall.typeCode != 'GEMR' AND act.status = 'DRAFT' AND act.executionStage = 'DISPATCHING'"}); // For Same day orders
        });

    }
}
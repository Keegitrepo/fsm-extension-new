var globalCompanyObject;
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

    await fetchData('emergencyList', comapnyObject); // For Emergency orders
    await fetchData('sameDayList', comapnyObject); // For Same day orders
}

async function fetchData(listId, comapnyObject) {
    // Next call for loading the data asynchronously time to time
    let inputValue = document.getElementById("inputId") ? document.getElementById("inputId").value : 10; // i.e default value
    let loadDataTimePeriod = Number(inputValue) * 60 * 1000; // time in milli seconds i.e 1min * 60sec * 1000ms
    setTimeout((listId, comapnyObject) => {
        fetchData(listId, comapnyObject);
    }, loadDataTimePeriod, listId, comapnyObject);

    const { cloudHost, account, company, accountId, companyId } = comapnyObject; // extract required context from event content

    const header = {
        "Content-Type": "application/json",
        "X-Client-ID": "000179c6-c140-44ec-b48e-b447949fd5c9",
        "X-Client-Version": "1.0",
        "Authorization": `bearer ${sessionStorage.getItem('token')}`,
        "X-Account-ID": accountId,
        "X-Company-ID": companyId
    };
    let url = `https://${cloudHost}/api/query/v1?account=${account}&company=${company}&dtos=Activity.43;ServiceCall.27;Address.22`
    let body = JSON.stringify({ "query": "SELECT act, scall, add FROM Activity act JOIN ServiceCall scall ON scall.id = act.object.objectId JOIN Address add ON add.id = act.address"});
    let method = 'POST';

    try {
        let response = await fetch(url, {
            method: method,
            headers: header,
            body: body
        });
        let jsonResponse = await response.json();
        createMapUrlAndAddItemToList(listId, jsonResponse, cloudHost);
        return true
    } catch (error) {
        return alert(`Failed to fetch the data due to ${error} \n Reload the page manually`);
    }
}
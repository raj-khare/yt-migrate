const CLIENT_ID = "YOUR CLIENT_ID";
const API_KEY = "YOUR API_KEY";

const signinOldAccount = document.getElementById("signin-old");
const signinNewAccount = document.getElementById("signin-new");
const notifications = document.getElementById("notifications");
const transfer = document.getElementById("transfer");
const oldData = document.getElementById("old-data");

//Polyfill
if (!Promise.allSettled) {
  Promise.allSettled = function(promises) {
    return Promise.all(
      promises.map(p =>
        Promise.resolve(p).then(
          value => ({
            state: "fulfilled",
            value
          }),
          reason => ({
            state: "rejected",
            reason
          })
        )
      )
    );
  };
}

const USER_DATA = {
  subscriptions: []
};

gapi.load("client:auth2", () => {
  gapi.auth2.init({ client_id: CLIENT_ID });
});

const notify = msg => {
  notifications.innerHTML = msg;
};

const authenticate = () => {
  notify("Signing in...");
  return gapi.auth2
    .getAuthInstance()
    .signIn({ scope: "https://www.googleapis.com/auth/youtube" })
    .then(
      () => {
        notify("Sign-in successful");
      },
      err => {
        throw new Error("Sign-in failed. Please try again");
      }
    );
};

const loadClient = () => {
  gapi.client.setApiKey(API_KEY);
  return gapi.client
    .load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
    .then(null, err => {
      throw new Error("Error. Please try again");
    });
};

const getSubscriptions = (pageToken = null) => {
  notify("Fetching your subscriptions...");

  return gapi.client.youtube.subscriptions
    .list({
      part: "snippet",
      mine: true,
      maxResults: 50,
      pageToken: pageToken ? pageToken : undefined
    })
    .then(
      response => {
        response.result.items.forEach(element => {
          USER_DATA.subscriptions.push(element.snippet.resourceId.channelId);
        });
        nextPage = response.result.nextPageToken;
        if (nextPage)
          return getSubscriptions((pageToken = response.result.nextPageToken));
        else {
          notify("Subscriptions fetched successfully");
        }
      },
      err => {
        throw new Error("Error fetching data. Please try again");
      }
    );
};

const transferSubscriptions = () => {
  notify("Transferring subsciptions...");
  return Promise.allSettled(
    USER_DATA.subscriptions.map(el =>
      gapi.client.youtube.subscriptions.insert({
        part: "snippet",
        resource: {
          snippet: {
            resourceId: {
              kind: "youtube#channel",
              channelId: el
            }
          }
        }
      })
    )
  );
};

const getOldAccountData = () => {
  return getSubscriptions();
};

signinOldAccount.onclick = () => {
  authenticate()
    .then(loadClient)
    .then(() => signinOldAccount.remove())
    .then(() => getOldAccountData())
    .then(() => {
      notify("Data fetched successfully. Please sign in with your new account");
      let content = `| ${USER_DATA.subscriptions.length} subscriptions |`;
      oldData.innerHTML = content;
    })
    .then(() => signinNewAccount.classList.remove("d-none"))
    .catch(err => {
      notify(err);
    });
};

signinNewAccount.onclick = () => {
  authenticate()
    .then(loadClient)
    .then(() => signinNewAccount.remove())
    .then(() => notify("Signed in with new account"))
    .then(() => transfer.classList.remove("d-none"))
    .catch(err => {
      notify(err);
    });
};

transfer.onclick = () => {
  let numSubscriptions = 0;
  transferSubscriptions()
    .then(results => {
      results.forEach((result, num) => {
        if (result.status == "fulfilled") {
          numSubscriptions += 1;
        }
      });
    })
    .then(() =>
      notify(
        `${numSubscriptions}/${USER_DATA.subscriptions.length} subscriptions transferred successfully!`
      )
    )
    .catch(err => {
      notify("Error. Please try again");
    });
};

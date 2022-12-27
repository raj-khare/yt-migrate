const CLIENT_ID =
  "CLIENT_ID";
let tokenClient;

const signinOldAccount = document.getElementById("signin-old");
const signinNewAccount = document.getElementById("signin-new");
const notifications = document.getElementById("notifications");
const transfer = document.getElementById("transfer");
const oldData = document.getElementById("old-data");
const completed = document.getElementById("completed");
const remaining = document.getElementById("remaining");
const already = document.getElementById("already");
const stats = document.getElementById("stats");

//Polyfill
if (!Promise.allSettled) {
  Promise.allSettled = function (promises) {
    return Promise.all(
      promises.map((p) =>
        Promise.resolve(p).then(
          (value) => ({
            state: "fulfilled",
            value,
          }),
          (reason) => ({
            state: "rejected",
            reason,
          })
        )
      )
    );
  };
}

const USER_DATA = {
  oldSubscriptions: {},
  currentSubscriptions: {},
  alreadyInAccount: {},
  newSubscriptionsCount: 0,
};

const notify = (msg) => {
  notifications.textContent = msg;
};

function gapiInit() {
  gapi.client.init({}).then(function () {
    gapi.client.load(
      "https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest"
    );
  });
}

function gapiLoad() {
  gapi.load("client", gapiInit);
}

function gisInit() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "https://www.googleapis.com/auth/youtube",
    callback: "", // defined at request time
  });
}

const getSubscriptions = async (
  type,
  pageToken = null,
  callback = () => {}
) => {
  notify(`Fetching your ${type} subscriptions...`);
  try {
    const userData =
      type === "old"
        ? USER_DATA.oldSubscriptions
        : USER_DATA.currentSubscriptions;
    const response = await gapi.client.youtube.subscriptions.list({
      part: "snippet",
      mine: true,
      maxResults: 50,
      pageToken: pageToken ? pageToken : undefined,
      order: "alphabetical",
    });
    response.result.items.forEach((element) => {
      userData[element.snippet.resourceId.channelId] = element.snippet.title;
    });
    nextPage = response.result.nextPageToken;
    if (nextPage)
      await getSubscriptions(type, (pageToken = response.result.nextPageToken));
    else {
      notify("Subscriptions fetched successfully");
    }
    callback();
  } catch (err) {
    throw new Error(err.result.error.errors[0].reason);
  }
};

const transferSubscriptions = () => {
  notify("Transferring subsciptions...");
  promises = [];
  for (let [id, name] of Object.entries(USER_DATA.oldSubscriptions)) {
    if (!(id in USER_DATA.currentSubscriptions)) {
      // New subscription
      USER_DATA.newSubscriptionsCount += 1;
      promises.push(
        new Promise((res, rej) => {
          gapi.client.youtube.subscriptions
            .insert({
              part: "snippet",
              resource: {
                snippet: {
                  resourceId: {
                    kind: "youtube#channel",
                    channelId: id,
                  },
                },
              },
            })
            .then(() => {
              res({ name });
            })
            .catch(() => {
              rej({ name });
            });
        })
      );
    } else {
      USER_DATA.alreadyInAccount[id] = name;
    }
  }
  return Promise.allSettled(promises);
};

signinOldAccount.onclick = async () => {
  tokenClient.callback = (resp) => {
    if (resp.error !== undefined) notify(resp.error);

    signinOldAccount.remove();
    getSubscriptions("old", null, () => {
      notify(
        "Old subscriptions fetched successfully. Please sign in with your new account"
      );
      let content = `| ${
        Object.keys(USER_DATA.oldSubscriptions).length
      } subscriptions |`;
      oldData.textContent = content;
      signinNewAccount.classList.remove("d-none");
    });
  };
  tokenClient.requestAccessToken();
};

signinNewAccount.onclick = async () => {
  tokenClient.callback = (resp) => {
    if (resp.error !== undefined) {
      throw resp;
    }
    signinNewAccount.remove();
    getSubscriptions("current", null, () => {
      notify("Current subscriptions fetched successfully!");
      transfer.classList.remove("d-none");
      dryrun.classList.remove("d-none");
    });
  };
  tokenClient.requestAccessToken();
};

const addSubscriptionToDom = (name, el) => {
  let li = document.createElement("li");
  li.appendChild(document.createTextNode(name));
  li.classList.add("list-group-item");
  el.appendChild(li);
};

transfer.onclick = async () => {
  try {
    const successSubs = [];
    const failedSubs = [];
    const results = await transferSubscriptions();
    console.log(results);
    results.forEach((result) => {
      if (result.status == "fulfilled") {
        successSubs.push(result.value.name);
      } else {
        failedSubs.push(result.reason.name);
      }
    });
    if (successSubs.length === USER_DATA.newSubscriptionsCount)
      notify(
        `${successSubs.length}/${
          USER_DATA.newSubscriptionsCount
        } new subscriptions transferred successfully! ${
          Object.keys(USER_DATA.oldSubscriptions).length -
          USER_DATA.newSubscriptionsCount
        } subscriptions are already in your account.`
      );
    else
      notify(
        `${successSubs.length}/${USER_DATA.newSubscriptionsCount} new subscriptions transferred. You may have exhausted the quota. Please try remaining tomorrow`
      );
    stats.classList.remove("d-none");
    stats.classList.add("d-flex");
    successSubs.forEach((el) => addSubscriptionToDom(el, completed));
    failedSubs.forEach((el) => addSubscriptionToDom(el, remaining));
    Object.values(USER_DATA.alreadyInAccount).forEach((el) =>
      addSubscriptionToDom(el, already)
    );
    transfer.remove();
  } catch (err) {
    notify(err.message);
  }
};

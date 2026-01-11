const jobs = new Map();

function createJob(id) {
  const job = {
    id,
    status: "queued",
    phase: "Queued",
    phaseProgress: 0,
    overallProgress: 0,
    result: null,
    error: null,
    canceled: false,
    clients: []
  };
  jobs.set(id, job);
  return job;
}

function getJob(id) {
  return jobs.get(id);
}

function updateJob(id, data) {
  Object.assign(jobs.get(id), data);
}

module.exports = {
  createJob,
  getJob,
  updateJob,
  jobs
};

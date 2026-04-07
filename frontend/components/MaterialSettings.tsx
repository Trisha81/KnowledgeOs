'use client';

import React from 'react';

export default function MaterialSettings() {
  return (
    <div className="fixed-plugin">
      <a className="fixed-plugin-button text-dark position-fixed px-3 py-2">
        <i className="material-icons py-2">settings</i>
      </a>
      <div className="card shadow-lg">
        <div className="card-header pb-0 pt-3">
          <div className="float-start">
            <h5 className="mt-3 mb-0">Material UI Configurator</h5>
            <p>See our dashboard options.</p>
          </div>
          <div className="float-end mt-4">
            <button className="btn btn-link text-dark p-0 fixed-plugin-close-button">
              <i className="material-icons">clear</i>
            </button>
          </div>
        </div>
        <hr className="horizontal dark my-1" />
        <div className="card-body pt-sm-3 pt-0">
          <div>
            <h6 className="mb-0">Sidebar Colors</h6>
          </div>
          <a href="#" className="switch-trigger background-color">
            <div className="badge-colors my-2 text-start">
              <span className="badge filter bg-gradient-primary active" data-color="primary"></span>
              <span className="badge filter bg-gradient-dark" data-color="dark"></span>
              <span className="badge filter bg-gradient-info" data-color="info"></span>
              <span className="badge filter bg-gradient-success" data-color="success"></span>
              <span className="badge filter bg-gradient-warning" data-color="warning"></span>
              <span className="badge filter bg-gradient-danger" data-color="danger"></span>
            </div>
          </a>
          <div className="mt-3">
            <h6 className="mb-0">Sidenav Type</h6>
            <p className="text-sm">Choose between different sidenav types.</p>
          </div>
          <div className="d-flex">
            <button className="btn bg-gradient-dark px-3 mb-2 active" data-class="bg-gradient-dark">Dark</button>
            <button className="btn bg-gradient-dark px-3 mb-2 ms-2" data-class="bg-transparent">Transparent</button>
            <button className="btn bg-gradient-dark px-3 mb-2 ms-2" data-class="bg-white">White</button>
          </div>
          <div className="mt-3 d-flex">
            <h6 className="mb-0">Navbar Fixed</h6>
            <div className="form-check form-switch ps-0 ms-auto my-auto">
              <input className="form-check-input mt-1 ms-auto" type="checkbox" id="navbarFixed" />
            </div>
          </div>
          <hr className="horizontal dark my-3" />
          <div className="mt-2 d-flex">
            <h6 className="mb-0">Light / Dark</h6>
            <div className="form-check form-switch ps-0 ms-auto my-auto">
              <input className="form-check-input mt-1 ms-auto" type="checkbox" id="dark-version" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const initScAuth = () => {
  const defaultCredentials = {
    email: "test.seller@gem.com",
    password: "GoldenSeller.gem25"
  };

  const getStored = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  };

  const setStored = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const getScUser = () => getStored("scUser");
  const getScSession = () => getStored("scSession");

  const loginMessage = document.getElementById("loginMessage");
  const showLoginMessage = (text, variant) => {
    if (!loginMessage) return;
    loginMessage.textContent = text;
    loginMessage.classList.remove("error", "success");
    if (variant) {
      loginMessage.classList.add(variant);
    }
  };

  const tryFallbackLogin = (email, password) => {
    const savedUser = JSON.parse(localStorage.getItem("scUser") || "null");
    const matchesSaved =
      savedUser &&
      savedUser.email &&
      savedUser.password &&
      email.toLowerCase() === savedUser.email.toLowerCase() &&
      password === savedUser.password;
    const matchesDefault =
      email.toLowerCase() === defaultCredentials.email &&
      password === defaultCredentials.password;

    if (matchesSaved || matchesDefault) {
      localStorage.setItem(
        "scSession",
        JSON.stringify({ email, loggedAt: new Date().toISOString() })
      );
      const fallbackUser = matchesSaved
        ? savedUser
        : {
            storeName: "Golden Era Motors Sister",
            storeAddress: "TBD",
            contactNumber: "000-000-0000",
            personnel: "Registered Personnel",
            creditAmount: "25000",
            terms: "COD",
            email,
            password
          };
      localStorage.setItem("scUser", JSON.stringify(fallbackUser));
      showLoginMessage("Login successful, redirecting...", "success");
      setTimeout(() => {
            window.location.href = "sc-dashboard.html"; // Assuming dashboard is the next page after login
      }, 250);
      return true;
    }

    return false;
  };

  const togglePasswordBtn = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("loginPassword");
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", () => {
      const isCurrentlyVisible = passwordInput.type === "text";
      passwordInput.type = isCurrentlyVisible ? "password" : "text";
      const nowVisible = passwordInput.type === "text";
      togglePasswordBtn.setAttribute("aria-pressed", String(nowVisible));
      togglePasswordBtn.setAttribute(
        "aria-label",
        nowVisible ? "Hide password" : "Show password"
      );
      passwordInput.focus();
    });
  }

  const loginForm = document.getElementById("scLoginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      showLoginMessage("", ""); // clear

      const emailInput = document.getElementById("loginEmail");
      const passwordInputField = document.getElementById("loginPassword");
      if (!emailInput || !passwordInputField) return;

      const email = emailInput.value.trim();
      const password = passwordInputField.value;

      if (!email || !password) {
        showLoginMessage("Please enter both email and password.", "error");
        return;
      }

      if (typeof supabaseClient === "undefined") {
        if (tryFallbackLogin(email, password)) return;
        showLoginMessage(
          "Authentication service unavailable. Use the temporary credentials or register.",
          "error"
        );
        return;
      }

      try {
        const { data, error } = await supabaseClient.rpc("authenticate_sc_user", {
          p_email: email,
          p_password: password
        });

        if (error) {
          if (tryFallbackLogin(email, password)) return;
          showLoginMessage(error.message || "Invalid login credentials.", "error");
          return;
        }

        const userRow = Array.isArray(data) ? data[0] : data;
        if (userRow) {
          const storeId = userRow?.store_id || userRow?.storeId;
          if (storeId && typeof supabaseClient !== "undefined") {
            try {
              // Pre-fetch approvers and attach them to the user object
              const { data: approversData } = await supabaseClient.rpc("get_sc_approvers_by_store", {
                p_store_id: storeId
              });
              if (Array.isArray(approversData)) {
                userRow.approvers = approversData;
              }
            } catch (approverError) {
              console.warn("Could not pre-fetch approvers on login", approverError);
            }
          }

          localStorage.setItem("scUser", JSON.stringify(userRow));
          localStorage.setItem(
            "scSession",
            JSON.stringify({ email, loggedAt: new Date().toISOString() })
          );
          showLoginMessage("Login successful! Redirecting...", "success");
          setTimeout(() => {
            window.location.href = "sc-dashboard.html";
          }, 500);
          return;
        }

        if (tryFallbackLogin(email, password)) return;
        showLoginMessage("Invalid login credentials. Please check your email and password.", "error");
      } catch (err) {
        if (tryFallbackLogin(email, password)) return;
        showLoginMessage("Something went wrong while logging in.", "error");
        console.error(err);
      }
    });
  }

  const registerForm = document.getElementById("scRegisterForm");
  const scUser = getScUser();
  const scSession = getScSession();
  const isLoggedIn = Boolean(scUser || scSession);
  const isRegisterView = Boolean(registerForm && !isLoggedIn);
  const isViewOnly = Boolean(registerForm && scUser);
  if (registerForm && isLoggedIn && !scUser) {
    window.location.href = "index.html";
    return;
  }

  const getStoreProfile = (user) => ({
    storeName: user?.storeName || user?.store_name || user?.store || user?.name || "",
    storeAddress: user?.storeAddress || user?.store_address || user?.address || "",
    contactNumber: user?.contactNumber || user?.contact_number || user?.contact || "",
    personnel: user?.personnel || user?.assigned_personnel || user?.assignedPersonnel || "",
    creditAmount:
      user?.creditAmount ??
      user?.credit_limit ??
      user?.creditLimit ??
      user?.credit ??
      "",
    terms: user?.terms || user?.payment_terms || user?.paymentTerms || "",
    email: user?.email || user?.user_email || ""
  });

  const setFieldValue = (id, value) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = value != null ? String(value) : "";
  };

  const setStoreFieldsReadOnly = (isReadOnly) => {
    if (!registerForm) return;
    registerForm.classList.toggle("sc-readonly", isReadOnly);
    const fieldIds = [
      "storeName",
      "storeAddress",
      "contactNumber",
      "personnel",
      "creditAmount",
      "terms",
      "email"
    ];
    fieldIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === "SELECT") {
        el.disabled = isReadOnly;
      } else {
        el.readOnly = isReadOnly;
      }
    });
  };

  const updateHeaderStoreName = (name) => {
    const headerName = document.getElementById("scHeaderStoreName");
    if (headerName) headerName.textContent = name || "Guest";
  };

  const setupModal = (modalEl) => {
    if (!modalEl) return { open: () => {}, close: () => {} };
    const closeEls = Array.from(modalEl.querySelectorAll("[data-modal-close]"));
    const cancelEls = Array.from(modalEl.querySelectorAll("[data-modal-cancel]"));

    const close = () => {
      modalEl.classList.remove("is-visible");
      document.body.classList.remove("has-modal");
    };

    const open = () => {
      modalEl.classList.add("is-visible");
      document.body.classList.add("has-modal");
    };

    closeEls.forEach((btn) => btn.addEventListener("click", close));
    cancelEls.forEach((btn) => btn.addEventListener("click", close));
    modalEl.addEventListener("click", (event) => {
      if (event.target === modalEl) close();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modalEl.classList.contains("is-visible")) {
        close();
      }
    });

    return { open, close };
  };

  const applyStoreProfileToForm = (profile) => {
    setFieldValue("storeName", profile.storeName);
    setFieldValue("storeAddress", profile.storeAddress);
    setFieldValue("contactNumber", profile.contactNumber);
    setFieldValue("personnel", profile.personnel);
    setFieldValue("creditAmount", profile.creditAmount);
    setFieldValue("email", profile.email);
    const termsInput = document.getElementById("terms");
    if (termsInput && profile.terms) {
      termsInput.value = profile.terms;
    }
  };

  if (registerForm) {
    let activeUser = scUser || {};
    const storeId = String(activeUser?.store_id || activeUser?.storeId || "").trim();
    const supabaseReady = typeof supabaseClient !== "undefined" && Boolean(storeId);
    let approvers = Array.isArray(activeUser.approvers) ? activeUser.approvers : [];

    const normalizeApprover = (entry) => ({
      id: entry?.id || entry?.approver_id || null,
      store_id: entry?.store_id || null,
      full_name: entry?.full_name || entry?.fullName || "",
      designation: entry?.designation || entry?.title || "",
      username: entry?.username || entry?.user || "",
      password_hash: entry?.password_hash || entry?.passwordHash || entry?.password || ""
    });

    const saveUser = (updates) => {
      activeUser = { ...activeUser, ...updates };
      setStored("scUser", activeUser);
      return activeUser;
    };

    const fetchApproversFromSupabase = async () => {
      if (!supabaseReady) return false;
      try {
        const { data, error } = await supabaseClient.rpc("get_sc_approvers_by_store", {
          p_store_id: storeId
        });

        if (error) {
          console.warn("Unable to fetch approvers", error);
          return false;
        }

        if (Array.isArray(data)) {
          approvers = data.map(normalizeApprover);
          approvers.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
          saveUser({ approvers });
        }

        return true;
      } catch (err) {
        console.warn("Approver fetch failed", err);
        return false;
      }
    };

    const deleteApproverFromSupabase = async (approverId) => {
      if (!supabaseReady || !approverId) return false;
      try {
        const { error } = await supabaseClient.rpc("sc_delete_approver", {
          p_store_id: storeId,
          p_approver_id: approverId
        });
        if (error) {
          console.warn("Unable to delete approver", error);
          return false;
        }
        return true;
      } catch (err) {
        console.warn("Approver delete failed", err);
        return false;
      }
    };

    const isUsernameTaken = async (username, ignoreId = null) => {
      if (!supabaseReady || !username) return false;
      try {
        const { data, error } = await supabaseClient
          .from("sc_approvers")
          .select("id")
          .eq("store_id", storeId)
          .eq("username", username)
          .limit(1);

        if (error) {
          console.warn("Unable to validate approver username", error);
          return false;
        }

        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return false;
        if (ignoreId && String(row.id) === String(ignoreId)) return false;
        return true;
      } catch (err) {
        console.warn("Approver username validation failed", err);
        return false;
      }
    };

    const formatApproverSaveError = (error, usernameValue) => {
      const message = String(error?.message || error || "").toLowerCase();
      if (
        message.includes("duplicate") ||
        message.includes("unique") ||
        message.includes("sc_approvers_unique_store_username")
      ) {
        return `Username already exists: ${usernameValue}`;
      }
      return String(error?.message || "Unable to save approver.");
    };

    const deleteApproverModal = document.getElementById("deleteApproverModal");
    const confirmDeleteBtn = document.getElementById("confirmDeleteApproverBtn");
    const deleteModalApi = setupModal(deleteApproverModal);
    let pendingDeleteIndex = null;

    const executeDeleteApprover = async (index) => {
      const target = approvers[index];
      if (!target) return;

      if (supabaseReady && target.id) {
        const okDelete = await deleteApproverFromSupabase(target.id);
        if (!okDelete) {
          alert("Unable to remove approver right now.");
          return;
        }
      }

      approvers = approvers.filter((_, idx) => idx !== index);
      saveUser({ approvers });
      renderApprovers();
    };

    const handleRemoveApprover = async (index) => {
      const target = approvers[index];
      if (!target) return;

      if (deleteApproverModal) {
        pendingDeleteIndex = index;
        const msg = document.getElementById("deleteApproverMessage");
        if (msg) msg.textContent = `Are you sure you want to remove ${target.full_name || "this approver"}?`;
        deleteModalApi.open();
      } else {
        // Fallback if modal is missing
        if (window.confirm(`Remove approver ${target.full_name || "this approver"}?`)) {
          executeDeleteApprover(index);
        }
      }
    };

    const renderApprovers = () => {
      const listEl = document.getElementById("approversList");
      if (!listEl) return;
      listEl.innerHTML = "";
      if (!approvers.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No approvers saved yet.";
        listEl.appendChild(empty);
        return;
      }

      approvers.forEach((approver, idx) => {
        const card = document.createElement("div");
        card.className = "approver-card";

        const header = document.createElement("div");
        header.className = "approver-card-header";

        const title = document.createElement("div");
        title.className = "approver-card-title";
        title.textContent = `Approver #${idx + 1}`;

        const actions = document.createElement("div");
        actions.className = "approver-card-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "sc-btn sc-btn-ghost";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => openApproverModal(idx));

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "sc-btn sc-btn-ghost sc-btn-danger";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => handleRemoveApprover(idx));

        if (isViewOnly && storeId && approver.store_id && String(approver.store_id) !== storeId) {
          editBtn.disabled = true;
          removeBtn.disabled = true;
          editBtn.title = "This approver belongs to another store.";
          removeBtn.title = "This approver belongs to another store.";
        }

        actions.appendChild(editBtn);
        actions.appendChild(removeBtn);
        header.appendChild(title);
        header.appendChild(actions);

        const body = document.createElement("div");
        body.style.padding = "1rem 1.25rem";
        body.style.display = "flex";
        body.style.alignItems = "center";
        body.style.gap = "1rem";

        // Simple avatar placeholder
        const avatar = document.createElement("div");
        avatar.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="background:rgba(255,255,255,0.08); color:var(--text-light); border-radius:50%; padding:8px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

        const infoStack = document.createElement("div");
        infoStack.style.display = "flex";
        infoStack.style.flexDirection = "column";
        infoStack.style.lineHeight = "1.4";

        infoStack.innerHTML = `
          <span style="font-weight: 600; color: var(--text); font-size: 1.05rem;">${approver.full_name || "Unknown Name"}</span>
          <span style="color: var(--text-light); font-size: 0.9rem;">${approver.designation || "No designation"}</span>
          <span style="color: var(--text-light); font-size: 0.8rem; margin-top: 2px; opacity: 0.7;">@${approver.username || "-"}</span>
        `;

        body.appendChild(avatar);
        body.appendChild(infoStack);

        card.appendChild(header);
        card.appendChild(body);
        listEl.appendChild(card);
      });
    };

    const initApprovers = async () => {
      const listEl = document.getElementById("approversList");
      if (listEl) {
        listEl.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; padding: 2rem; color: #888;">
            <div style="
              width: 20px; 
              height: 20px; 
              border: 2px solid currentColor; 
              border-right-color: transparent; 
              border-radius: 50%; 
              animation: sc-spin 0.8s linear infinite;
              margin-right: 0.75rem;"></div>
            <span>Loading approvers...</span>
          </div>
          <style>@keyframes sc-spin { to { transform: rotate(360deg); } }</style>`;
      }
      if (isViewOnly) {
        await fetchApproversFromSupabase();
      } else {
        // For registration, just use what's in memory.
        approvers = (activeUser.approvers || []).map(normalizeApprover);
      }
      renderApprovers();
    };

    // MODALS AND FORMS (shared between register and view-only)

    // -- Store Edit Modal (only for view-only)
    // This logic is inside the isViewOnly block

    // -- Approver Modals (shared)
    const approverModal = document.getElementById("approverModal");
    const approverForm = document.getElementById("approverForm");
    const approverModalTitle = document.getElementById("approverModalTitle");
    const addApproverBtn = document.getElementById("addApproverBtn");
    const approverModalApi = setupModal(approverModal);
    let editingIndex = null;

    const storeEditModal = document.getElementById("storeEditModal");
    const storeEditForm = document.getElementById("storeEditForm");
    const storeModalApi = setupModal(storeEditModal);

    const fillStoreEditForm = () => {
      const currentProfile = getStoreProfile(activeUser);
      setFieldValue("editStoreName", currentProfile.storeName);
      setFieldValue("editStoreAddress", currentProfile.storeAddress);
      setFieldValue("editContactNumber", currentProfile.contactNumber);
      setFieldValue("editPersonnel", currentProfile.personnel);
      setFieldValue("editCreditAmount", currentProfile.creditAmount);
      setFieldValue("editEmail", currentProfile.email);
      const termsInput = document.getElementById("editTerms");
      if (termsInput && currentProfile.terms) {
        termsInput.value = currentProfile.terms;
      }
    };

    if (storeEditForm) {
      storeEditForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const storeName = document.getElementById("editStoreName")?.value.trim();
        const storeAddress = document.getElementById("editStoreAddress")?.value.trim();
        const contactNumber = document.getElementById("editContactNumber")?.value.trim();
        const personnel = document.getElementById("editPersonnel")?.value.trim();
        const creditAmount = document.getElementById("editCreditAmount")?.value || "";
        const terms = document.getElementById("editTerms")?.value || "";
        const email = document.getElementById("editEmail")?.value.trim();

        if (!storeName || !storeAddress || !contactNumber || !personnel || !email) {
          alert("Please fill out all required store fields.");
          return;
        }

        const updatedUser = saveUser({
          storeName,
          store_name: storeName,
          store: storeName,
          storeAddress,
          store_address: storeAddress,
          contactNumber,
          contact_number: contactNumber,
          personnel,
          assigned_personnel: personnel,
          creditAmount,
          credit_limit: Number(creditAmount) || 0,
          terms,
          payment_terms: terms,
          email
        });

        applyStoreProfileToForm(getStoreProfile(updatedUser));
        updateHeaderStoreName(storeName);
        storeModalApi.close();
      });
    }

    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener("click", () => {
        if (pendingDeleteIndex !== null) {
          executeDeleteApprover(pendingDeleteIndex);
          deleteModalApi.close();
          pendingDeleteIndex = null;
        }
      });
    }

    const setApproverForm = (data) => {
      setFieldValue("approverFullName", data?.full_name || "");
      setFieldValue("approverDesignation", data?.designation || "");
      setFieldValue("approverUsername", data?.username || "");
      setFieldValue("approverPassword", "");
    };

    const approverUsernameInput = document.getElementById("approverUsername");
    if (approverUsernameInput) {
      approverUsernameInput.addEventListener("input", () => {
        approverUsernameInput.value = approverUsernameInput.value.toLowerCase();
      });
    }

    const openApproverModal = (index = null) => {
      editingIndex = typeof index === "number" ? index : null;
      if (approverModalTitle) {
        approverModalTitle.textContent = editingIndex === null ? "Add Approver" : "Edit Approver";
      }
      setApproverForm(editingIndex === null ? {} : approvers[editingIndex]);
      approverModalApi.open();
      const firstField = document.getElementById("approverFullName");
      if (firstField) firstField.focus();
    };

    if (addApproverBtn) {
      addApproverBtn.addEventListener("click", () => openApproverModal());
    }

    if (approverForm) {
      approverForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const fullName = document.getElementById("approverFullName")?.value.trim();
        const designation = document.getElementById("approverDesignation")?.value.trim();
        const usernameRaw = document.getElementById("approverUsername")?.value.trim();
        const password = document.getElementById("approverPassword")?.value || "";
        const username = (usernameRaw || "").toLowerCase();

        if (!fullName || !designation || !username) {
          alert("Please fill out all required approver fields.");
          return;
        }

        if (!isViewOnly) { // Local validation for registration
          const duplicate = approvers.find((entry, idx) => {
            if (editingIndex !== null && idx === editingIndex) return false;
            return (entry.username || "").toLowerCase() === username;
          });

          if (duplicate) {
            alert(`Duplicate approver username found: ${username}`);
            return;
          }
        }

        let nextApprover = {
          full_name: fullName,
          designation,
          username,
          password_hash: ""
        };

        if (editingIndex === null && !password) {
          alert("Please enter a password for the new approver.");
          return;
        }

        if (isViewOnly && supabaseReady) {
          const ignoreId = editingIndex !== null ? approvers[editingIndex]?.id || null : null;
          if (await isUsernameTaken(username, ignoreId)) {
            alert(`Username already exists: ${username}`);
            return;
          }
          try {
            const approverId = editingIndex !== null ? approvers[editingIndex]?.id || null : null;
            const { data, error } = await supabaseClient.rpc("sc_upsert_approver", {
              p_store_id: storeId,
              p_approver_id: approverId,
              p_full_name: nextApprover.full_name,
              p_designation: nextApprover.designation,
              p_username: nextApprover.username,
              p_password: password || null
            });

            if (error) {
              alert(formatApproverSaveError(error, username));
              return;
            }

            const row = Array.isArray(data) ? data[0] : data;
            if (row) {
              nextApprover = normalizeApprover(row);
            } else if (approverId) {
              nextApprover.id = approverId;
              nextApprover.password_hash = approvers[editingIndex]?.password_hash || "";
            }
          } catch (err) {
            console.error(err);
            alert("Unable to save approver right now.");
            return;
          }
        }

        if (editingIndex !== null) {
          approvers[editingIndex] = nextApprover;
        } else {
          approvers = [...approvers, nextApprover];
        }

        if (isViewOnly) {
          saveUser({ approvers });
        }

        renderApprovers();
        approverModalApi.close();
      });
    }

    if (isViewOnly) {
      const profile = getStoreProfile(scUser || {});
      const storeTitle = registerForm.querySelector(".form-card h2");
      const storeSubhead = registerForm.querySelector(".form-card .subhead");
      const approverSubhead = registerForm.querySelector(".info-card .subhead");
      const registerActions = registerForm.querySelector(".sc-register-actions");
      const passwordWrap = document.getElementById("passwordFieldWrap");
      const storeEditBtn = document.getElementById("storeEditBtn");

      if (storeTitle) storeTitle.textContent = "Store Details";
      if (storeSubhead) storeSubhead.textContent = "Review your store profile before requesting updates.";
      if (approverSubhead) approverSubhead.textContent = "Current approvers on file for order authorization.";
      if (registerActions) registerActions.style.display = "none";
      if (passwordWrap) passwordWrap.style.display = "none";
      if (storeEditBtn) storeEditBtn.style.display = "inline-flex";

      registerForm.addEventListener("submit", (event) => {
        event.preventDefault();
      });

      applyStoreProfileToForm(profile);
      setStoreFieldsReadOnly(true);

      if (storeEditBtn) {
        storeEditBtn.addEventListener("click", () => {
          fillStoreEditForm();
          storeModalApi.open();
          const firstField = document.getElementById("editStoreName");
          if (firstField) firstField.focus();
        });
      }

      initApprovers();
    }

    if (isRegisterView) {
      initApprovers();
    }
  }

  if (registerForm && isRegisterView) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const storeNameInput = document.getElementById("storeName");
      const storeAddressInput = document.getElementById("storeAddress");
      const contactNumberInput = document.getElementById("contactNumber");
      const personnelInput = document.getElementById("personnel");
      const creditAmountInput = document.getElementById("creditAmount");
      const termsInput = document.getElementById("terms");
      const emailInput = document.getElementById("email");
      const passwordInputField = document.getElementById("password");

      if (
        !storeNameInput ||
        !storeAddressInput ||
        !contactNumberInput ||
        !personnelInput ||
        !creditAmountInput ||
        !termsInput ||
        !emailInput ||
        !passwordInputField
      ) {
        alert("Please fill out all registration fields.");
        return;
      }

      const payload = {
        storeName: storeNameInput.value.trim(),
        storeAddress: storeAddressInput.value.trim(),
        contactNumber: contactNumberInput.value.trim(),
        personnel: personnelInput.value.trim(),
        creditAmount: creditAmountInput.value,
        terms: termsInput.value,
        email: emailInput.value.trim(),
        password: passwordInputField.value
      };

      if (
        !payload.storeName ||
        !payload.storeAddress ||
        !payload.contactNumber ||
        !payload.personnel ||
        !payload.email ||
        !payload.password
      ) {
        alert("Please fill out all required registration fields.");
        return;
      }

      const registrationTimeApprovers = document.getElementById("approversList") ? approvers : [];
      if (!registrationTimeApprovers || !registrationTimeApprovers.length) {
        alert("Please add at least 1 approver (OIC).");
        return;
      }

      if (typeof supabaseClient === "undefined") { 
        localStorage.setItem("scUser", JSON.stringify({ ...payload, approvers: registrationTimeApprovers }));
        alert("Registration saved locally (Supabase unavailable).");
        window.location.href = "index.html";
        return;
      }

      try {
        const { data, error } = await supabaseClient.rpc("register_sc_user", {
          p_store_name: payload.storeName,
          p_store_address: payload.storeAddress,
          p_contact_number: payload.contactNumber,
          p_personnel: payload.personnel,
          p_credit_limit: Number(payload.creditAmount) || 0,
          p_terms: payload.terms,
          p_email: payload.email,
          p_password: payload.password
        });

        if (error) {
          alert(error.message || "Unable to register.");
          return;
        }

        const userRow = Array.isArray(data) ? data[0] : data;
        if (!userRow) {
          alert("Registration succeeded but no user data returned.");
          window.location.href = "sc-login.html";
          return;
        }

        const storeId = String(userRow.store_id || userRow.storeId || "").trim();
        if (registrationTimeApprovers && registrationTimeApprovers.length && storeId) {
          const { error: approverError } = await supabaseClient.rpc("register_sc_approvers", {
            p_store_id: storeId,
            p_approvers: registrationTimeApprovers
          });
          if (approverError) {
            console.warn("Unable to save approvers", approverError);
            alert(`Registration saved, but approvers were not saved: ${approverError.message || "Unknown error"}`);
          }
        }

        localStorage.setItem("scUser", JSON.stringify(userRow));
        localStorage.setItem("scSession", JSON.stringify({ email: payload.email, loggedAt: new Date().toISOString() }));
        alert("Registration successful");
        window.location.href = "sc-dashboard.html";
      } catch (err) {
        console.error(err);
        alert("Something went wrong while registering.");
      }
    });
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initScAuth);
} else {
  initScAuth();
}

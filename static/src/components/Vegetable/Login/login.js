/** @odoo-module **/

import { Component, onWillStart, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { session } from "@web/session";

class VegetableLogin extends Component {
    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.user = useService("user");

        this.state = useState({
            // Mode: 'login' or 'register'
            mode: "login",

            // Login fields
            username: "",
            password: "",
            showPassword: false,

            // Register fields
            regName: "",
            regUsername: "",
            regEmail: "",
            regPassword: "",
            regConfirmPassword: "",
            regAddress: "",
            showRegPassword: false,

            // Shared
            loading: false,
            error: "",
            successMessage: "",
            checkingAuth: true,
        });

        onWillStart(async () => {
            // If already logged in (not a public/anonymous user), bypass login form
            // session.uid is present if authenticated. 
            // In Odoo 17, 'public user' usually has a UID but with limited groups.
            const isPublic = await this.orm.call("res.users", "has_group", ["base.group_public"]);
            
            if (session.uid && !isPublic) {
                const isAdmin = await this.orm.call("res.users", "has_group", ["base.group_system"]);
                if (isAdmin) {
                    await this.action.doAction("vegetable_house_admin_dashboard");
                } else {
                    await this.action.doAction("vegetable_house_user_dashboard");
                }
            }
            this.state.checkingAuth = false;
        });
    }

    // ─── Mode toggle ────────────────────────────────────────────────────────────

    switchToRegister() {
        this.state.mode = "register";
        this.state.error = "";
        this.state.successMessage = "";
    }

    switchToLogin() {
        this.state.mode = "login";
        this.state.error = "";
        this.state.successMessage = "";
    }

    togglePassword() {
        this.state.showPassword = !this.state.showPassword;
    }

    toggleRegPassword() {
        this.state.showRegPassword = !this.state.showRegPassword;
    }

    // ─── LOGIN ──────────────────────────────────────────────────────────────────

    async onLogin() {
        const { username, password } = this.state;

        if (!username.trim()) {
            this.state.error = "Please enter your username.";
            return;
        }
        if (!password.trim()) {
            this.state.error = "Please enter your password.";
            return;
        }

        this.state.error = "";
        this.state.loading = true;

        try {
            // Find the most robust Source for the DB name
            // If session.db is missing (happens when logged out in some cases),
            // we look for odoo.db or the URL param.
            const dbName = session.db || odoo.db || (new URLSearchParams(window.location.search).get('db'));

            if (!dbName) {
                this.state.error = "Could not detect database name. Please ensure the URL contains ?db=YOUR_DB";
                this.state.loading = false;
                return;
            }

            const response = await fetch("/web/session/authenticate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    id: 1,
                    params: {
                        db: dbName,
                        login: username.trim(),
                        password: password.trim(),
                    },
                }),
            });

            const result = await response.json();

            if (result.error) {
                this.state.error = result.error.data?.message || result.error.message || "Login failed.";
                return;
            }

            if (!result.result || !result.result.uid) {
                this.state.error = "Invalid username or password. Please try again.";
                return;
            }

            // After login, the most robust way to initialize the full backend session
            // is to reload. We'll set the target action in the hash before reload.
            
            // Check admin status — using the UID from the result is faster.
            // UID 2 is usually admin, but it's safer to just reload and let 
            // the menu/guard handle it, or check via UID.
            
            // We'll perform one ORM call with the new session!
            // If this fails, we just reload to the standard home.
            try {
                const isAdmin = await this.orm.call("res.users", "has_group", ["base.group_system"]);
                const nextAction = isAdmin ? "vegetable_house_admin_dashboard" : "vegetable_house_user_dashboard";
                window.location.hash = `action=${nextAction}`;
            } catch (rpcErr) {
                console.warn("RPC failed right after login, defaulting to reload:", rpcErr);
            }

            window.location.reload();
        } catch (err) {
            this.state.error = "An unexpected error occurred. Please try again.";
            console.error("Login error:", err);
        } finally {
            this.state.loading = false;
        }
    }

    async onLoginKeyDown(ev) {
        if (ev.key === "Enter") await this.onLogin();
    }

    // ─── REGISTER ───────────────────────────────────────────────────────────────

    async onRegister() {
        const {
            regName,
            regUsername,
            regEmail,
            regPassword,
            regConfirmPassword,
            regAddress,
        } = this.state;

        if (!regName.trim()) {
            this.state.error = "Please enter your full name.";
            return;
        }
        if (!regUsername.trim()) {
            this.state.error = "Please enter a username.";
            return;
        }
        if (!regEmail.trim() || !regEmail.includes("@")) {
            this.state.error = "Please enter a valid email address.";
            return;
        }
        if (!regPassword.trim() || regPassword.length < 6) {
            this.state.error = "Password must be at least 6 characters.";
            return;
        }
        if (regPassword !== regConfirmPassword) {
            this.state.error = "Passwords do not match. Please re-enter.";
            return;
        }

        this.state.error = "";
        this.state.loading = true;

        try {
            const result = await this.orm.call(
                "res.users",
                "register_vegetable_user",
                [
                    regName.trim(),
                    regUsername.trim(),
                    regEmail.trim(),
                    regPassword,
                    regAddress.trim(),
                ]
            );

            if (result.success) {
                const createdUsername = regName.trim();
                const loginName = regUsername.trim();

                this.state.successMessage = result.message;

                // Clear register fields
                this.state.regName = "";
                this.state.regEmail = "";
                this.state.regPassword = "";
                this.state.regConfirmPassword = "";
                this.state.regAddress = "";

                // Pre-fill login
                this.state.username = loginName;
                this.state.regUsername = "";

                // Auto-switch to login after 1.8s
                setTimeout(() => {
                    this.state.mode = "login";
                    this.state.successMessage = `Account for ${createdUsername} created successfully. Please sign in below.`;
                    this.state.error = "";
                }, 1800);
            } else {
                this.state.error = result.message;
            }
        } catch (err) {
            this.state.error = "Registration failed. Please try again.";
            console.error("Register error:", err);
        } finally {
            this.state.loading = false;
        }
    }

    async onRegisterKeyDown(ev) {
        if (ev.key === "Enter") await this.onRegister();
    }
}

VegetableLogin.template = "vegetable_house.Login";

registry.category("actions").add("vegetable_house_login", VegetableLogin);

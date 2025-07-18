--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_users (id, username, password_hash, role, created_at, updated_at, display_name, company, staff_position, staff_level) FROM stdin;
de213d6f-7185-4968-b88d-d0bfb3194dfb	admin	$2a$06$jhds75UBAz2Cn9pbSG/A..yEDi6vOGiiC85ZSNGQc5ZFCaj7cQa8G	admin	2025-07-18 05:44:52.499222+00	2025-07-18 05:44:52.499222+00	admin	\N	\N	\N
2551639a-85a6-4baa-a3ba-6bb8b93d06e5	staff	$2a$06$bVDFPLKlAsDaGhZH1fFLNO99w3OVLge0KA3OPwu9Qr.Eb8ayVhq.q	staff	2025-07-18 05:44:52.499222+00	2025-07-18 05:44:52.499222+00	staff	\N	\N	\N
ec0a67d7-a567-4330-b6ad-18595b7ce0c7	user_17664	$2b$10$OoWnD/X9EXPnJnlzEie5Ku9VKJ5DPw51uprAPxtzs9mE/xH8ufiYG	agency	2025-07-18 06:02:42.971565+00	2025-07-18 06:02:42.971565+00	aaa	adfsa	\N	\N
890e6380-85c1-4d77-95c1-c54747c6676e	user_96044	$2b$10$5/0lXQ5xRQC18NiPy.duPOOyaSIzKdr2JzSyBEYSz4A70gQ.jQCjm	attendee	2025-07-18 06:30:32.357865+00	2025-07-18 06:30:32.357865+00	参加者a	群馬	\N	\N
9ce0c6db-14fa-496e-80e1-645a4ecbcefc	user_46900	$2b$10$rgJE6o5nSQjJjtVXefZbVeeQEwVLeyC/n90vg1ubWtlTBrFfFKZvO	admin	2025-07-18 06:34:57.542757+00	2025-07-18 06:34:57.542757+00	開発太郎	\N	\N	\N
\.


--
-- Data for Name: timers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.timers (id, title, type, duration, state, mode, start_time, end_time, paused_at, elapsed_time, show_seconds, play_sound, color, overtime_color, message, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: current_timer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.current_timer (id, timer_id, updated_at) FROM stdin;
00000000-0000-0000-0000-000000000001	\N	2025-07-18 05:53:00.853804+00
\.


--
-- Data for Name: event_status; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_status (id, status, updated_at, created_at) FROM stdin;
3d0fb18e-4ec7-4d58-9227-db6bd0bc7482	パネルディスカッション	2025-07-18 06:24:24.269994+00	2025-07-18 05:44:52.520451+00
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.secrets (name, value, created_at, updated_at) FROM stdin;
jwt_secret	super-secret-jwt-token-with-at-least-32-characters-long	2025-07-18 05:44:52.499222+00	2025-07-18 05:44:52.499222+00
\.


--
-- Data for Name: staff_login_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_login_tokens (id, staff_id, token, created_at, expires_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: staff_status; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_status (id, staff_id, status, custom_status, updated_at, created_at) FROM stdin;
\.


--
-- Data for Name: staff_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_status_history (id, staff_id, status, custom_status, recorded_at, notes, created_by) FROM stdin;
\.


--
-- Data for Name: timer_actions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.timer_actions (id, timer_id, trigger_time, type, message, color, flash, executed, enabled, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: timer_action_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.timer_action_results (id, action_id, timer_id, action_type, message, color, flash, executed_at, created_at) FROM stdin;
\.


--
-- Data for Name: timer_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.timer_messages (id, timer_id, text, color, flash, "timestamp", created_at) FROM stdin;
\.


--
-- Data for Name: visitors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.visitors (id, count, event_date, updated_at, created_at) FROM stdin;
7a8afe55-6432-47d3-8d9d-23803c27829c	0	2025-07-18	2025-07-18 05:44:52.514737+00	2025-07-18 05:44:52.514737+00
\.


--
-- PostgreSQL database dump complete
--


import axios from "axios";

const API = "http://localhost:8000/messages";

export const sendMessage = (data) =>
  axios.post(`${API}/`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

export const getInbox = (userId) =>
  axios.get(`${API}/inbox/${userId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

export const getSent = (userId) =>
  axios.get(`${API}/sent/${userId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

export const getMessage = (msgId) =>
  axios.get(`${API}/${msgId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

export const markAsRead = (msgId) =>
  axios.patch(`${API}/${msgId}/read`, {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

export const deleteMessage = (msgId) =>
  axios.delete(`${API}/${msgId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

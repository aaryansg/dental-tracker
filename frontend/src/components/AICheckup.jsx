import React, { useState, useRef, useEffect } from 'react';
import {
  FaRobot,
  FaUpload,
  FaCamera,
  FaSpinner,
  FaHistory,
  FaLightbulb,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes,
  FaTooth,
  FaTeeth,
  FaTeethOpen,
  FaSmile,
  FaFrown
} from 'react-icons/fa';
import Sidebar from './Sidebar';
import { aiCheckupAPI } from '../api/api';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';
import '../styles/AICheckup.css';
import '../styles/MarkdownOverride.css';

const AICheckup = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
      setActiveTab('camera');
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast.error('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setActiveTab('upload');
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);

      canvas.toBlob((blob) => {
        const file = new File([blob], 'dental-checkup.jpg', { type: 'image/jpeg' });
        setImage(file);
        setPreview(URL.createObjectURL(file));
        // Clear previous analysis when new photo is captured
        setAnalysis(null);
        setRecommendations(null);
        stopCamera();
        toast.success('Photo captured successfully!');
      }, 'image/jpeg', 0.9);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setImage(file);
      setPreview(URL.createObjectURL(file));
      // Clear previous analysis when new image is uploaded
      setAnalysis(null);
      setRecommendations(null);
      toast.success('Image uploaded successfully!');
    }
  };

  const handleSubmit = async () => {
    if (!image) {
      toast.error('Please select or capture an image first');
      return;
    }

    setLoading(true);
    setAnalysis(null);
    setRecommendations(null);

    try {
      const response = await aiCheckupAPI.uploadImage(image);

      console.log('API Response:', response.data);

      setAnalysis(response.data.analysis);
      setRecommendations(response.data.recommendations);

      toast.success('Analysis complete!');

      if (!showHistory) {
        fetchHistory();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to analyze image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await aiCheckupAPI.getHistory();
      setHistory(response.data.history);
      setShowHistory(true);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load history');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConditionIcon = (condition) => {
    if (condition?.includes('Caries')) return <FaTooth />;
    if (condition?.includes('Gingivitis')) return <FaTeeth />;
    if (condition?.includes('Ulcer')) return <FaFrown />;
    if (condition?.includes('Calculus')) return <FaTeethOpen />;
    if (condition?.includes('Discoloration')) return <FaSmile />;
    return <FaInfoCircle />;
  };

  const getConditionColor = (condition) => {
    if (condition?.includes('Caries')) return '#e53e3e';
    if (condition?.includes('Gingivitis')) return '#d69e2e';
    if (condition?.includes('Ulcer')) return '#c53030';
    if (condition?.includes('Calculus')) return '#3182ce';
    if (condition?.includes('Discoloration')) return '#805ad5';
    return '#718096';
  };

  return (
    <div className="dashboard">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="main-content">
        <header className="checkup-header">
          <div className="header-content">
            <h1>
              <FaRobot className="header-icon" />
              AI Dental Checkup
            </h1>
            <p className="header-subtitle">
              Upload a photo of your teeth for AI-powered dental analysis
            </p>
          </div>


        </header>

        <div className="checkup-container">
          {/* Upload/Camera Section */}
          <div className="upload-section">
            <div className="tab-navigation">
              <button
                className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('upload');
                  if (showCamera) stopCamera();
                }}
              >
                <FaUpload />
                Upload Image
              </button>
              <button
                className={`tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
                onClick={startCamera}
              >
                <FaCamera />
                Use Camera
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'upload' && (
                <div className="upload-area">
                  {preview ? (
                    <div className="image-preview-container">
                      <div className="image-preview">
                        <img src={preview} alt="Preview" />
                        <button
                          className="btn btn-danger remove-btn"
                          onClick={() => {
                            setImage(null);
                            setPreview(null);
                          }}
                        >
                          <FaTimes /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="upload-dropzone"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FaUpload className="upload-icon" />
                      <p className="upload-text">Click to browse or drag & drop</p>
                      <p className="upload-subtext">
                        Supports JPG, PNG up to 5MB
                      </p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'camera' && (
                <div className="camera-section">
                  {showCamera ? (
                    <div className="camera-container">
                      <div className="camera-preview">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="camera-video"
                        />
                      </div>
                      <div className="camera-controls">
                        <button className="btn btn-primary" onClick={capturePhoto}>
                          <FaCamera /> Capture Photo
                        </button>
                        <button className="btn btn-outline" onClick={stopCamera}>
                          <FaTimes /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="camera-prompt">
                      <FaCamera className="camera-icon" />
                      <h3>Camera Access Required</h3>
                      <p>
                        Click the button below to start your camera and take a photo
                        of your teeth for analysis.
                      </p>
                      <button className="btn btn-primary" onClick={startCamera}>
                        Start Camera
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {image && (
              <div className="analyze-section">
                <button
                  className="btn btn-primary analyze-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <FaSpinner className="spinner" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FaRobot />
                      Analyze with AI
                    </>
                  )}
                </button>
                <p className="analyze-note">
                  AI will analyze your dental image and provide results
                </p>
              </div>
            )}
          </div>

          {/* Results Section */}
          {analysis && (
            <div className="results-section">
              <h2 className="results-title">
                <FaLightbulb />
                Analysis Results
              </h2>

              {/* Model Status */}
              <div className="model-status-indicator">
                <div className="model-status-content">
                  <span className="model-status-label">Analysis by:</span>
                  <span className={`model-status-value ${analysis.model_loaded ? 'loaded' : 'mock'}`}>
                    {analysis.model_loaded ? 'AI Model' : 'Demo System'}
                  </span>
                </div>
              </div>

              <div className="results-grid">
                {/* Detected Conditions */}
                {analysis.detected_conditions && analysis.detected_conditions.length > 0 ? (
                  <div className="result-card conditions-card">
                    <div className="result-header">
                      <h3>Detected Conditions</h3>
                      <div className="result-badge detected-count">
                        {analysis.detected_conditions.length} found
                      </div>
                    </div>

                    <div className="conditions-list-detailed">
                      {analysis.detected_conditions.map((condition, index) => (
                        <div
                          key={index}
                          className="condition-item-detailed"
                          style={{ borderLeftColor: getConditionColor(condition.name) }}
                        >
                          <div className="condition-header-detailed">
                            <div className="condition-icon-title">
                              <span className="condition-icon-large" style={{ color: getConditionColor(condition.name) }}>
                                {getConditionIcon(condition.name)}
                              </span>
                              <div className="condition-title-section">
                                <h4 className="condition-title">{condition.name}</h4>
                                <p className="condition-confidence">
                                  AI Confidence: {(condition.confidence * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="condition-footer">
                            <div className="condition-recommendation">
                              <FaLightbulb className="recommendation-icon" />
                              <span>
                                {condition.name === 'Caries' && 'Requires dental treatment'}
                                {condition.name === 'Gingivitis' && 'Improve gum care routine'}
                                {condition.name === 'Mouth Ulcers' && 'Consult healthcare provider'}
                                {condition.name === 'Calculus' && 'Professional cleaning needed'}
                                {condition.name === 'Tooth Discoloration' && 'Consider whitening options'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="result-card success-card">
                    <div className="result-header">
                      <h3>No Conditions Detected</h3>
                      <div className="result-badge clean">
                        <FaCheckCircle /> Clean
                      </div>
                    </div>
                    <div className="success-content">
                      <FaCheckCircle className="success-icon" />
                      <div className="success-message">
                        <h4>Great news!</h4>
                        <p>No dental conditions were detected in the analysis.</p>
                      </div>
                    </div>
                  </div>
                )}



                {/* Risk Assessment */}
                {analysis.gingivitis_risk && (
                  <div className="result-card risk-card">
                    <div className="result-header">
                      <h3>Gingivitis Risk</h3>
                      <div className={`result-badge ${analysis.gingivitis_risk === 'high' ? 'detected' : 'clean'}`}>
                        {analysis.gingivitis_risk === 'high' ? 'High Risk' : 'Low Risk'}
                      </div>
                    </div>
                    <p className="result-description">
                      {analysis.gingivitis_risk === 'high'
                        ? 'Increased risk of gum inflammation detected'
                        : 'Low risk of gum inflammation'}
                    </p>
                  </div>
                )}

                {analysis.cavity_risk && (
                  <div className="result-card risk-card">
                    <div className="result-header">
                      <h3>Cavity Risk</h3>
                      <div className={`result-badge ${analysis.cavity_risk === 'high' ? 'detected' : 'clean'}`}>
                        {analysis.cavity_risk === 'high' ? 'High Risk' : 'Low Risk'}
                      </div>
                    </div>
                    <p className="result-description">
                      {analysis.cavity_risk === 'high'
                        ? 'Increased risk of cavities detected'
                        : 'Low risk of cavities'}
                    </p>
                  </div>
                )}

                {analysis.plaque_detected !== undefined && (
                  <div className="result-card">
                    <div className="result-header">
                      <h3>Plaque Detection</h3>
                      <div className={`result-badge ${analysis.plaque_detected ? 'detected' : 'clean'}`}>
                        {analysis.plaque_detected ? 'Detected' : 'Not Detected'}
                      </div>
                    </div>
                    <p className="result-description">
                      {analysis.plaque_detected
                        ? 'Plaque buildup detected'
                        : 'No significant plaque detected'}
                    </p>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {recommendations && (
                <div className="recommendations-section">
                  <h3 className="recommendations-title">
                    <FaLightbulb />
                    Recommendations
                  </h3>

                  <div className="recommendations-content">
                    <div className="recommendations-text markdown-content">
                      <Markdown
                        components={{
                          ul: ({ node, ...props }) => <ul style={{ display: 'block', listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.75rem', marginBottom: '0.75rem' }} {...props} />,
                          ol: ({ node, ...props }) => <ol style={{ display: 'block', listStyleType: 'decimal', paddingLeft: '1.5rem', marginTop: '0.75rem', marginBottom: '0.75rem' }} {...props} />,
                          li: ({ node, ...props }) => <li style={{ display: 'list-item', margin: '0.375rem 0', lineHeight: '1.6' }} {...props} />
                        }}
                      >
                        {recommendations}
                      </Markdown>
                    </div>

                    <div className="recommendations-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          navigator.clipboard.writeText(recommendations);
                          toast.success('Copied to clipboard!');
                        }}
                      >
                        Copy Recommendations
                      </button>
                    </div>
                  </div>

                  <div className="disclaimer">
                    <FaShieldAlt className="disclaimer-icon" />
                    <div className="disclaimer-content">
                      <h4>Important Disclaimer</h4>
                      <p>
                        This AI analysis is for informational purposes only.
                        Always consult with a licensed dentist for proper diagnosis and treatment.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tips Section */}
          <div className="tips-section">
            <h3 className="tips-title">
              <FaLightbulb />
              Tips for Better Photos
            </h3>
            <div className="tips-grid">
              <div className="tip-card">
                <div className="tip-number">1</div>
                <h4>Good Lighting</h4>
                <p>Use natural light for clear photos</p>
              </div>
              <div className="tip-card">
                <div className="tip-number">2</div>
                <h4>Clean Teeth</h4>
                <p>Brush before taking photos</p>
              </div>
              <div className="tip-card">
                <div className="tip-number">3</div>
                <h4>Multiple Angles</h4>
                <p>Take photos from different angles</p>
              </div>
              <div className="tip-card">
                <div className="tip-number">4</div>
                <h4>Close-up</h4>
                <p>Get close to see tooth details</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICheckup;